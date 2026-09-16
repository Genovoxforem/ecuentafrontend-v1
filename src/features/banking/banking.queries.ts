import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseLegacyJson, fetchLegacyText, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseBankAccountFormPage, type BankAccountFormContext } from './bankAccountFormParser'
import {
  parseBankEntryDetailPage,
  parseBankEntryLogPage,
  parseBankEntryLedgerPage,
  splitMdy,
  type BankEntryDetail,
  type BankEntryLog,
  type BankEntryLedger,
} from './bankEntryDetailParser'
import { parseBankBudgetPage, type BankBudget } from './bankBudgetParser'
import { parseBankTransactionCategListPage, parseBankTransactionCategToken, type BankTransactionCategoryList } from './bankTransactionCategParser'

// The 4 real JSON APIs found in the Banking module this session (confirmed
// by reading each file's PHP directly) — everything else in this module is
// a classic form-POST/HTML-only legacy page (see the module's other 18
// pages, all NotBuiltPage placeholders).
//
// Two of these (bank-sidebar-list-ajax.php, loan-sidebar-list-ajax.php) are
// the same generic *-sidebar-list-ajax.php template already seen elsewhere
// in this app (Users Groups/Tags) — real, but with the same hardcoded
// length=25 page-size cap and, per this session's audit, NO permission
// check at all (any logged-in user can call them). categories/
// tag-sidebarlist-ajax.php is the exact same generic tag list already used
// for Users Tags, reused here with type_id=5 (Categorie::TYPE_ACCOUNT).

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// Shared by BankAccountDetail.tsx and BankEntriesList.tsx to turn a
// formatted amount cell (e.g. "1,234.56") from bankentries_list_ajax.php
// back into a number for client-side aggregation.
export function parseAmount(cell: string): number {
  const n = parseFloat(cell.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

// ── Bank Accounts dropdown (api/bank_accounts.php) — a 5th real JSON
// endpoint found on a later pass, genuinely returns a `bank` (bank name)
// field the sidebar-list endpoint above doesn't. Its own SQL hardcodes
// `WHERE clos = 0` though (open accounts only), so a closed account simply
// won't appear here — this is used only to enrich the detail page's "Bank
// Name" field (falling back to "—" if not found), not as a list source.
export interface BankAccountDropdownRow {
  id: number
  label: string
  ref: string
  bank: string
}
interface RawBankAccountDropdownResponse {
  success: boolean
  results: Array<{ id: number; label: string; ref: string; bank: string | null }>
}
export function useBankAccountsDropdown() {
  return useQuery({
    queryKey: ['banking', 'accounts', 'dropdown'],
    queryFn: async (): Promise<BankAccountDropdownRow[]> => {
      const res = await fetch('/api/bank_accounts.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<RawBankAccountDropdownResponse>(res)
      if (!data.success) return []
      return data.results.map((r) => ({ id: r.id, label: r.label, ref: r.ref, bank: r.bank ?? '' }))
    },
    staleTime: 1000 * 30,
  })
}

// ── Bank Accounts (bank-sidebar-list-ajax.php) ───────────────────────────
export interface BankAccountRow {
  id: number
  label: string
  accountNumber: string
  currencyCode: string
  balance: number
}
interface RawBankAccountRow {
  rowid: string
  totbank: string | null
  label: string
  number: string | null
  currency_code: string
}
interface RawSidebarListResponse<T> {
  recordsTotal: string
  recordsFiltered: string
  data: T[]
}
export function useBankAccountsList() {
  return useQuery({
    queryKey: ['banking', 'accounts', 'list'],
    queryFn: async (): Promise<BankAccountRow[]> => {
      const res = await fetch('/compta/bank/bank-sidebar-list-ajax.php?draw=1&start=0', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<RawSidebarListResponse<RawBankAccountRow>>(res)
      return data.data.map((r) => ({
        id: Number(r.rowid),
        label: r.label,
        accountNumber: r.number ?? '',
        currencyCode: r.currency_code,
        balance: Number(r.totbank ?? 0),
      }))
    },
    staleTime: 1000 * 30,
  })
}

// ── List Entries (bankentries_list_ajax.php) — real DataTables, actively
// wired into the live bankentries_list.php page, proper permission checks ──
export interface BankEntryRow {
  // Row position in the current page — stable enough for a React key, but
  // NOT the real database id. Use rowid (below) for anything that needs to
  // identify the actual bank line (a route, a lookup).
  id: number
  // Real llx_bank.rowid, parsed off the Ref cell's own
  // compta/bank/line.php?rowid= link (see parseRefCell) — this is what
  // BankEntryDetail.tsx's route is keyed on.
  rowid: number
  refLabel: string
  description: string
  dateOps: string
  dateValue: string
  paymentType: string
  checkNum: string
  thirdParty: string
  // Real societe.rowid, parsed directly off the cell's own
  // societe/card.php?socid= link (see parseThirdPartyCell) — undefined when
  // the row has no third party or links to something other than a company
  // (e.g. an internal user for a salary/social-charge line).
  thirdPartySocid?: number
  // The cell's own trailing <small> subtitle (confirmed live, e.g.
  // "Voxforem Technologies" under a contact named "customer1") — the
  // contact's parent company affiliation. Undefined when the cell has none.
  thirdPartyCompany?: string
  bankAccount: string
  // Real llx_bank_account.rowid, parsed off the Bank Account cell's own
  // compta/bank/card.php?id= link (see parseAccountCell) — replaces the
  // previous name-matching workaround in BankEntriesList.tsx's findAccountId.
  bankAccountId?: number
  debit: string
  credit: string
  runningBalance: string
  accountStatement: string
  conciliated: boolean
}

// The Third-Party cell's real HTML (confirmed live) nests an avatar-initials
// div and a company-affiliation <small> subtitle inside/around the actual
// name, e.g.:
//   <a href="/societe/card.php?socid=5" ...><div class="avatar-circle" ...>
//   CU</div>customer1</a><br><small class="text-muted">Voxforem
//   Technologies</small>
// A blind stripTags() on this — the previous behavior — concatenates all of
// that with no separators ("CUcustomer1Voxforem Technologies"), which is why
// the name-matching link-up in BankEntriesList.tsx could never actually find
// a match against a real customer name. This extracts the genuine socid from
// the href (authoritative — no guessing) and the clean name from inside the
// <a> tag alone, dropping the avatar div's own text and the trailing <small>.
function parseThirdPartyCell(raw: string): { name: string; socid?: number; company?: string } {
  if (!raw) return { name: '' }
  const socidMatch = raw.match(/href="\/societe\/card\.php\?socid=(\d+)"/)
  const socid = socidMatch ? Number(socidMatch[1]) : undefined
  const withoutAvatar = raw.replace(/<div class="avatar-circle"[^>]*>[^<]*<\/div>/, '')
  const anchorMatch = withoutAvatar.match(/<a[^>]*>([\s\S]*?)<\/a>/)
  const name = stripTags(anchorMatch ? anchorMatch[1] : withoutAvatar).trim()
  const companyMatch = raw.match(/<small class="text-muted">([\s\S]*?)<\/small>/)
  const company = companyMatch ? stripTags(companyMatch[1]).trim() : undefined
  return { name, socid, company: company || undefined }
}

// The Ref cell's real HTML links to the transaction's own detail page
// (confirmed live: `<a href="/compta/bank/line.php?rowid=369&save_lastsearch_values=1"
// ...><span ...></span>369</a>`) — this is where BankEntryDetail.tsx's route
// gets its id from. A blind stripTags() (the previous behavior) kept the
// visible "369" text but threw the real rowid away.
function parseRefCell(raw: string): { label: string; rowid?: number } {
  if (!raw) return { label: '' }
  const rowidMatch = raw.match(/href="\/compta\/bank\/line\.php\?rowid=(\d+)/)
  return { label: stripTags(raw), rowid: rowidMatch ? Number(rowidMatch[1]) : undefined }
}

// The Bank Account cell's real HTML links to the account's own card
// (confirmed live: `<a href="/compta/bank/card.php?id=1" ...>PettyCash</a>`)
// — same technique as parseThirdPartyCell, replacing the previous
// name-matching workaround (findAccountId in BankEntriesList.tsx) with the
// real id straight off the cell.
function parseAccountCell(raw: string): { label: string; id?: number } {
  if (!raw) return { label: '' }
  const idMatch = raw.match(/href="\/compta\/bank\/card\.php\?id=(\d+)"/)
  return { label: stripTags(raw), id: idMatch ? Number(idMatch[1]) : undefined }
}
interface RawBankEntriesResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  data: string[][]
  error?: string
}
// All 4 of these are real, confirmed-by-source-read params the PHP already
// reads (search[value] for the global OR-search across ref/label/num_chq/
// num_releve/thirdparty-name/bankref; search_start_dt*/search_end_dt* for
// Operation Date; search_start_dv*/search_end_dv* for Value Date) — not
// fabricated, just previously unwired.
export interface BankEntriesFilters {
  search?: string
  dateOpsFrom?: string
  dateOpsTo?: string
  dateValueFrom?: string
  dateValueTo?: string
  unreconciledOnly?: boolean
}
function dateParts(iso: string): [string, string, string] {
  const [y, m, d] = iso.split('-')
  return [y, String(Number(m)), String(Number(d))]
}
export function useBankEntriesList(accountId: number | undefined, page: number, length: number, filters?: BankEntriesFilters) {
  return useQuery({
    queryKey: ['banking', 'entries', accountId, page, length, filters ?? null],
    queryFn: async (): Promise<{ rows: BankEntryRow[]; total: number; filtered: number }> => {
      const params = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      if (accountId) params.set('search_account', String(accountId))
      if (filters?.search) params.set('search[value]', filters.search)
      if (filters?.unreconciledOnly) params.set('search_conciliated', '0')
      if (filters?.dateOpsFrom) {
        const [y, m, d] = dateParts(filters.dateOpsFrom)
        params.set('search_start_dtyear', y)
        params.set('search_start_dtmonth', m)
        params.set('search_start_dtday', d)
      }
      if (filters?.dateOpsTo) {
        const [y, m, d] = dateParts(filters.dateOpsTo)
        params.set('search_end_dtyear', y)
        params.set('search_end_dtmonth', m)
        params.set('search_end_dtday', d)
      }
      if (filters?.dateValueFrom) {
        const [y, m, d] = dateParts(filters.dateValueFrom)
        params.set('search_start_dvyear', y)
        params.set('search_start_dvmonth', m)
        params.set('search_start_dvday', d)
      }
      if (filters?.dateValueTo) {
        const [y, m, d] = dateParts(filters.dateValueTo)
        params.set('search_end_dvyear', y)
        params.set('search_end_dvmonth', m)
        params.set('search_end_dvday', d)
      }
      const res = await fetch(`/compta/bank/bankentries_list_ajax.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<RawBankEntriesResponse>(res)
      if (data.error) throw new Error(data.error)
      const rows: BankEntryRow[] = data.data.map((cells, i) => {
        // cells[12] is `num_releve_html` when a statement number is linked, else it
        // just falls back to the same Yes/No text as cells[13] (see bankentries_list_ajax.php:
        // `!empty($num_releve_html) ? $num_releve_html : $conciliated`) — only keep it when
        // it's an actual statement number, not the redundant Yes/No fallback.
        const rawStatement = stripTags(cells[12] ?? '')
        const thirdPartyCell = parseThirdPartyCell(cells[6] ?? '')
        const refCell = parseRefCell(cells[0] ?? '')
        const accountCell = parseAccountCell(cells[7] ?? '')
        return {
          id: i,
          rowid: refCell.rowid ?? i,
          refLabel: refCell.label,
          description: stripTags(cells[1] ?? ''),
          dateOps: cells[2] ?? '',
          dateValue: cells[3] ?? '',
          paymentType: cells[4] ?? '',
          checkNum: cells[5] ?? '',
          thirdParty: thirdPartyCell.name,
          thirdPartySocid: thirdPartyCell.socid,
          thirdPartyCompany: thirdPartyCell.company,
          bankAccount: accountCell.label,
          bankAccountId: accountCell.id,
          debit: cells[8] ?? '',
          credit: cells[9] ?? '',
          runningBalance: cells[10] ?? '',
          accountStatement: ['yes', 'no'].includes(rawStatement.toLowerCase()) ? '' : rawStatement,
          conciliated: stripTags(cells[13] ?? '').toLowerCase() === 'yes',
        }
      })
      return { rows, total: data.recordsTotal, filtered: data.recordsFiltered }
    },
  })
}

// ── Entries To Reconcile count — reuses bankentries_list_ajax.php's real,
// confirmed `search_conciliated` filter param (read directly in that file's
// PHP source: `if ($search_conciliated !== '' ...) $sqlWhere .= " AND
// b.rappro = ".((int) $search_conciliated);`). This is the exact same
// unreconciled-row count (b.rappro=0, scoped to one account) that
// Account::load_board()'s `nbtodo` computes for the real list.php page's
// orange "to reconcile" badge — fetched here with length=1 just to read
// `recordsFiltered` cheaply, no row data needed. The real page's second,
// red-triangle "late" sub-count (`nbtodolate`) additionally depends on a
// server config value (bank->rappro->warning_delay) that no JSON endpoint
// exposes, so it is not reproduced. Likewise, the real page suppresses this
// badge entirely for cash / non-reconcilable / closed accounts based on the
// account's `courant`/`rappro`/`clos` fields — none of which any confirmed
// JSON endpoint returns either — so this hook always returns the raw count
// for every account rather than replicating that per-type suppression.
export function useReconcileCounts(accountIds: number[]) {
  return useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['banking', 'accounts', 'reconcile-count', id],
      queryFn: async (): Promise<number> => {
        const params = new URLSearchParams({ draw: '1', start: '0', length: '1', search_account: String(id), search_conciliated: '0' })
        const res = await fetch(`/compta/bank/bankentries_list_ajax.php?${params.toString()}`, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
        const data = await parseLegacyJson<{ recordsFiltered: number; error?: string }>(res)
        if (data.error) throw new Error(data.error)
        return data.recordsFiltered
      },
      staleTime: 1000 * 30,
    })),
  })
}

// ── Categories (categories/tag-sidebarlist-ajax.php?type_id=5) — the exact
// same generic llx_categorie list already used for Users Tags this session,
// reused here for Categorie::TYPE_ACCOUNT (=5) ────────────────────────────
export interface BankAccountCategoryRow {
  id: number
  name: string
  color: string
  createdAt: string
}
interface RawTagListResponse {
  data: Array<{ rowid: string; nom: string; code_client: string | null; phone: string | null }>
}
export function useBankAccountCategoriesList() {
  return useQuery({
    queryKey: ['banking', 'categories', 'list'],
    queryFn: async (): Promise<BankAccountCategoryRow[]> => {
      const res = await fetch('/categories/tag-sidebarlist-ajax.php?draw=1&start=0&type_id=5', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<RawTagListResponse>(res)
      return data.data
        .map((r) => ({ id: Number(r.rowid), name: r.nom, color: r.code_client || '', createdAt: r.phone ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 1000 * 30,
  })
}

// ── Loan List (loan/loan-sidebar-list-ajax.php) ──────────────────────────
export interface LoanRow {
  id: number
  label: string
  amountLabel: string
  statusLabel: string
}
interface RawLoanRow {
  rowid: number
  loan_details: string
  applied_amount: string
}
interface RawLoanListResponse {
  data: RawLoanRow[]
}
export function useLoanList() {
  return useQuery({
    queryKey: ['banking', 'loans', 'list'],
    queryFn: async (): Promise<LoanRow[]> => {
      const res = await fetch('/loan/loan-sidebar-list-ajax.php?draw=1&start=0', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<RawLoanListResponse>(res)
      return data.data.map((r) => {
        const divs = r.applied_amount.split('</div>').map(stripTags)
        return {
          id: r.rowid,
          label: stripTags(r.loan_details),
          amountLabel: divs[0] ?? '',
          statusLabel: divs[1] ?? '',
        }
      })
    },
    staleTime: 1000 * 30,
  })
}

// ── Linked Files (compta/bank/document.php) — real actions from
// core/actions_linkedfiles.inc.php, the exact same generic upload/link
// handler already confirmed and used for Project Documents
// (see projectDocuments.queries.ts): document.php includes it directly
// (confirmed by reading the source) with no CSRF check either. Field names
// are the same generic ones: Upload = sendit=1 + userfile=<File>; Link =
// linkit=1 + link=<url> + label=<label>. No JSON list endpoint exists here
// either, so BankLinkedFilesTab.tsx keeps its tables an honest empty state.
export function useUploadBankDocument(accountId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.set('sendit', '1')
      body.set('userfile', file)
      const res = await fetch(`/compta/bank/document.php?account=${accountId}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'accounts', 'detail', accountId, 'documents'] }),
  })
}

export function useLinkBankDocument(accountId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { url: string; label: string }) => {
      const body = new URLSearchParams({ linkit: '1', link: input.url, label: input.label })
      const res = await fetch(`/compta/bank/document.php?account=${accountId}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'accounts', 'detail', accountId, 'documents'] }),
  })
}

// ── New Financial Account (compta/bank/card.php?action=create) — no JSON
// API, but a genuine classic form-POST create, same category of action as
// the various real card.php POSTs already wired for Sales Orders/Quotations
// (confirm_validate, confirm_clone, etc.): fetch the real create page for its
// CSRF token + dropdown options (see bankAccountFormParser.ts), then POST the
// same field set that page's own form submits under action=add. Dolibarr
// redirects (302, followed transparently by fetch) to card.php?id=<new id>
// on success; on validation failure it re-renders the same ?action=create
// page instead, which this treats as failure and surfaces via a best-effort
// scrape of that page's own error banner — not confirmed against a live
// failure case (doing so would require actually submitting bad data), so the
// exact error text may need adjusting once this is used for real.
export function useBankAccountFormOptions() {
  return useQuery({
    queryKey: ['banking', 'accounts', 'createFormOptions'],
    queryFn: async (): Promise<BankAccountFormContext> => {
      return parseBankAccountFormPage(await fetchLegacyText('/compta/bank/card.php?action=create'))
    },
    staleTime: 1000 * 60 * 10,
  })
}

export interface NewBankAccountInput {
  ref: string
  label: string
  type: string
  currencyCode: string
  closed: boolean
  countryId: string
  stateId: string
  url: string
  comment: string
  initialBalance: string
  date: string // yyyy-mm-dd, converted to Dolibarr's day/month/year triplet below
  minAllowedBalance: string
  minDesiredBalance: string
  bankName: string
  accountNumber: string
  iban: string
  bic: string
  bankAddress: string
  ownerName: string
  ownerAddress: string
  accountingAccount: string
  accountingJournal: string
}

function extractLegacyErrorMessage(html: string, fallback: string): string {
  if (looksLikeLegacyLoginPageText(html)) return NOT_SIGNED_IN_MESSAGE
  const patterns = [/<div class="error"[^>]*>([\s\S]*?)<\/div>/, /<div class="wpeo-notification[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) {
      const text = stripTags(m[1]).trim()
      if (text) return text
    }
  }
  return fallback
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewBankAccountInput): Promise<number> => {
      const { token } = parseBankAccountFormPage(await fetchLegacyText('/compta/bank/card.php?action=create'))

      const [year, month, day] = input.date.split('-')
      const body = new URLSearchParams({
        token,
        action: 'add',
        ref: input.ref,
        label: input.label,
        type: input.type,
        account_currency_code: input.currencyCode,
        clos: input.closed ? '1' : '0',
        account_country_id: input.countryId,
        account_state_id: input.stateId,
        url: input.url,
        account_comment: input.comment,
        solde: input.initialBalance || '0',
        re: `${month}/${day}/${year}`,
        reday: day,
        remonth: month,
        reyear: year,
        account_min_allowed: input.minAllowedBalance,
        account_min_desired: input.minDesiredBalance,
        bank: input.bankName,
        number: input.accountNumber,
        iban: input.iban,
        bic: input.bic,
        domiciliation: input.bankAddress,
        proprio: input.ownerName,
        owner_address: input.ownerAddress,
        account_number: input.accountingAccount,
        fk_accountancy_journal: input.accountingJournal,
      })
      const res = await fetch('/compta/bank/card.php', { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const idMatch = res.url.match(/[?&]id=(\d+)/)
      if (!idMatch) {
        throw new Error(
          extractLegacyErrorMessage(
            await res.text(),
            'The backend rejected this account (a required field may be missing or invalid) — check Ref, Bank/cash label, Account type, Currency and Account country.',
          ),
        )
      }
      return Number(idMatch[1])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking', 'accounts'] })
    },
  })
}

// ── Bank Entry Detail (compta/bank/line.php?rowid=N) — no JSON API either,
// same category as card.php?action=create above: a genuine classic
// form-POST page, not read-only. "Bank entry" (action=update) edits the
// transaction's own fields; "Reconciliation" (action=setreconcile) is a
// separate form further down the same page for the statement number /
// reconciled flag — see bankEntryDetailParser.ts. Both POST back to this
// same URL and Dolibarr redirects (302, followed transparently by fetch)
// back to it on success, so the POST response is parsed the exact same way
// as the initial GET rather than issuing a third round-trip.
export function useBankEntryDetail(rowid: number | undefined) {
  return useQuery({
    queryKey: ['banking', 'entries', 'detail', rowid],
    queryFn: async (): Promise<BankEntryDetail> => {
      if (rowid === undefined) throw new Error('Missing bank entry id.')
      return parseBankEntryDetailPage(await fetchLegacyText(`/compta/bank/line.php?rowid=${rowid}`), rowid)
    },
    enabled: rowid !== undefined,
  })
}

export interface UpdateBankEntryInput {
  accountId: string
  paymentType: string
  checkNum: string
  transmitter: string
  bankOfCheck: string
  dateOps: string // MM/DD/YYYY, matching the real form's own text field
  dateValue: string // MM/DD/YYYY
  label: string
  amount: string
  categoryIds: string[]
}

export function useUpdateBankEntry(rowid: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateBankEntryInput): Promise<BankEntryDetail> => {
      if (rowid === undefined) throw new Error('Missing bank entry id.')
      const { token } = parseBankEntryDetailPage(await fetchLegacyText(`/compta/bank/line.php?rowid=${rowid}`), rowid)

      const dateo = splitMdy(input.dateOps)
      const datev = splitMdy(input.dateValue)
      const body = new URLSearchParams({
        token,
        action: 'update',
        orig_account: '',
        id: input.accountId,
        accountid: input.accountId,
        value: input.paymentType,
        num_chq: input.checkNum,
        emetteur: input.transmitter,
        banque: input.bankOfCheck,
        dateo: input.dateOps,
        dateoday: dateo.day,
        dateomonth: dateo.month,
        dateoyear: dateo.year,
        datev: input.dateValue,
        datevday: datev.day,
        datevmonth: datev.month,
        datevyear: datev.year,
        label: input.label,
        amount: input.amount,
      })
      for (const catId of input.categoryIds) body.append('custcats[]', catId)

      const res = await fetch(`/compta/bank/line.php?rowid=${rowid}`, { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (/<div class="error"/.test(html)) {
        throw new Error(extractLegacyErrorMessage(html, 'The backend rejected this update (a required field may be missing or invalid).'))
      }
      return parseBankEntryDetailPage(html, rowid)
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(['banking', 'entries', 'detail', rowid], detail)
      queryClient.invalidateQueries({ queryKey: ['banking', 'entries'] })
    },
  })
}

// ── Log tab (compta/bank/info.php?rowid=N) and LedgerEntry tab
// (compta/bank/ledgerentry.php?rowid=N) — the other two tabs BankEntryDetail.tsx
// shows alongside "Bank entry" above. Both real, read-only, no JSON API.
// Only fetched while their tab is actually open (enabled), not eagerly with
// the main detail — neither is needed for the default "Bank entry" tab.
export function useBankEntryLog(rowid: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['banking', 'entries', 'log', rowid],
    queryFn: async (): Promise<BankEntryLog> => {
      return parseBankEntryLogPage(await fetchLegacyText(`/compta/bank/info.php?rowid=${rowid}`))
    },
    enabled: enabled && rowid !== undefined,
  })
}

export function useBankEntryLedger(rowid: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['banking', 'entries', 'ledger', rowid],
    queryFn: async (): Promise<BankEntryLedger> => {
      return parseBankEntryLedgerPage(await fetchLegacyText(`/compta/bank/ledgerentry.php?rowid=${rowid}`))
    },
    enabled: enabled && rowid !== undefined,
  })
}

export interface ReconcileBankEntryInput {
  statement: string
  reconciled: boolean
}

export function useReconcileBankEntry(rowid: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReconcileBankEntryInput): Promise<BankEntryDetail> => {
      if (rowid === undefined) throw new Error('Missing bank entry id.')
      const { token } = parseBankEntryDetailPage(await fetchLegacyText(`/compta/bank/line.php?rowid=${rowid}`), rowid)

      const body = new URLSearchParams({ token, action: 'setreconcile', orig_account: '', backtopage: '', num_rel: input.statement })
      if (input.reconciled) body.set('reconciled', 'on')

      const res = await fetch(`/compta/bank/line.php?rowid=${rowid}`, { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (/<div class="error"/.test(html)) {
        throw new Error(extractLegacyErrorMessage(html, 'The backend rejected this reconciliation update.'))
      }
      return parseBankEntryDetailPage(html, rowid)
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(['banking', 'entries', 'detail', rowid], detail)
      queryClient.invalidateQueries({ queryKey: ['banking', 'entries'] })
    },
  })
}

// ── Bank entries by categories (compta/bank/budget.php) — no JSON API, a
// plain read-only report, no filters/mutations needed.
export function useBankBudget() {
  return useQuery({
    queryKey: ['banking', 'budget'],
    queryFn: async (): Promise<BankBudget> => {
      return parseBankBudgetPage(await fetchLegacyText('/compta/bank/budget.php'))
    },
  })
}

// ── Internal Transfer (compta/bank/transfer.php) — no JSON API, but a
// genuine classic form-POST create, same category as useCreateBankAccount
// above. The From/To account dropdowns reuse the already-confirmed-real
// useBankAccountsList() data instead of re-scraping transfer.php's own
// <select> (same account set, same real ids) — only the CSRF token is
// scraped, fetched fresh at submit time.
export interface NewInternalTransferInput {
  accountFromId: string
  accountToId: string
  date: string // yyyy-mm-dd, converted to Dolibarr's day/month/year triplet below
  label: string
  amount: string
  // Only meaningful (and only sent) when the two accounts have different
  // currencies — the real form hides this field entirely otherwise.
  amountTo?: string
}

function extractCsrfToken(html: string): string {
  const tokenMatch = html.match(/name="token"\s+value="([a-f0-9]+)"/)
  if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')
  return tokenMatch[1]
}

export function useCreateInternalTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInternalTransferInput): Promise<void> => {
      const token = extractCsrfToken(await fetchLegacyText('/compta/bank/transfer.php'))

      const [year, month, day] = input.date.split('-')
      const body = new URLSearchParams({
        token,
        action: 'add',
        account_from: input.accountFromId,
        account_to: input.accountToId,
        re: `${month}/${day}/${year}`,
        reday: day,
        remonth: month,
        reyear: year,
        label: input.label,
        amount: input.amount,
        amountto: input.amountTo ?? '',
      })
      const res = await fetch('/compta/bank/transfer.php', { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (/<div class="error"/.test(html)) {
        throw new Error(extractLegacyErrorMessage(html, 'The backend rejected this transfer (check the two accounts, date and amount).'))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking', 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['banking', 'entries'] })
    },
  })
}

// ── Tags/Categories Of Transactions (compta/bank/categ.php) — manages
// llx_bank_categ, distinct from the account-level Categories page
// (categories/tag-sidebarlist-ajax.php?type_id=5, which already has a real
// JSON API — see useBankAccountCategoriesList above). No JSON API here, but
// a genuine classic form-POST list with real add/edit/delete — see
// bankTransactionCategParser.ts.
export function useBankTransactionCategories() {
  return useQuery({
    queryKey: ['banking', 'transactionCategories'],
    queryFn: async (): Promise<BankTransactionCategoryList> => {
      return parseBankTransactionCategListPage(await fetchLegacyText('/compta/bank/categ.php'))
    },
  })
}

export function useAddBankTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (label: string): Promise<void> => {
      const token = extractCsrfToken(await fetchLegacyText('/compta/bank/categ.php'))
      const body = new URLSearchParams({ token, formfilteraction: 'list', action: 'list', label, add: 'Add' })
      const res = await fetch('/compta/bank/categ.php', { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (/<div class="error"/.test(html)) throw new Error(extractLegacyErrorMessage(html, 'The backend rejected this tag (a label is required).'))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'transactionCategories'] }),
  })
}

export function useUpdateBankTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, label }: { id: number; label: string }): Promise<void> => {
      const token = parseBankTransactionCategToken(await fetchLegacyText(`/compta/bank/categ.php?categid=${id}&action=edit`))
      const body = new URLSearchParams({ token, formfilteraction: 'list', action: 'list', categid: String(id), label, update: 'Edit' })
      const res = await fetch('/compta/bank/categ.php', { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (/<div class="error"/.test(html)) throw new Error(extractLegacyErrorMessage(html, 'The backend rejected this rename.'))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'transactionCategories'] }),
  })
}

// The real page's own delete link is a plain GET (categ.php?categid=N&
// action=delete&token=...) — no confirmation step server-side, so the UI
// layer is what's responsible for confirming before calling this.
export function useDeleteBankTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const token = extractCsrfToken(await fetchLegacyText('/compta/bank/categ.php'))
      const res = await fetch(`/compta/bank/categ.php?categid=${id}&action=delete&token=${token}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'transactionCategories'] }),
  })
}
