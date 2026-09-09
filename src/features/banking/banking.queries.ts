import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

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
      const data: RawBankAccountDropdownResponse = await res.json()
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
      const data: RawSidebarListResponse<RawBankAccountRow> = await res.json()
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
  id: number
  refLabel: string
  description: string
  dateOps: string
  dateValue: string
  paymentType: string
  checkNum: string
  thirdParty: string
  bankAccount: string
  debit: string
  credit: string
  runningBalance: string
  accountStatement: string
  conciliated: boolean
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
      const data: RawBankEntriesResponse = await res.json()
      if (data.error) throw new Error(data.error)
      const rows: BankEntryRow[] = data.data.map((cells, i) => {
        // cells[12] is `num_releve_html` when a statement number is linked, else it
        // just falls back to the same Yes/No text as cells[13] (see bankentries_list_ajax.php:
        // `!empty($num_releve_html) ? $num_releve_html : $conciliated`) — only keep it when
        // it's an actual statement number, not the redundant Yes/No fallback.
        const rawStatement = stripTags(cells[12] ?? '')
        return {
          id: i,
          refLabel: stripTags(cells[0] ?? ''),
          description: stripTags(cells[1] ?? ''),
          dateOps: cells[2] ?? '',
          dateValue: cells[3] ?? '',
          paymentType: cells[4] ?? '',
          checkNum: cells[5] ?? '',
          thirdParty: stripTags(cells[6] ?? ''),
          bankAccount: stripTags(cells[7] ?? ''),
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
        const data: { recordsFiltered: number; error?: string } = await res.json()
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
      const data: RawTagListResponse = await res.json()
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
      const data: RawLoanListResponse = await res.json()
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
