import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBankAccounts } from '../../api/bank'
import { isMissingEndpoint } from '../../api/products'
import { parseLegacyJson, fetchLegacyText, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import type { BankAccountListRow } from './bankAccountsListParser'
import {
  addBankTransactionCategory,
  countUnreconciled,
  createBankAccount,
  createInternalTransfer,
  deleteBankTransactionCategory,
  deleteBankDocument,
  loadAccountOptions,
  loadBankAccountsDetailed,
  loadBankDocuments,
  loadBankStatements,
  loadChequeArea,
  loadBankStatsDay,
  loadBankStatsMonth,
  loadBankStatsType,
  loadBankBudget,
  loadBankEntries,
  loadBankEntryDetail,
  loadBankEntryLedger,
  loadBankEntryLog,
  loadBankTransactionCategories,
  loadLoanList,
  updateBankTransactionCategory,
  type NewBankAccountBody,
} from './bankingFapi'
import type { BankAccountFormContext } from './bankAccountFormParser'
import {
  parseBankEntryDetailPage,
  splitMdy,
  type BankEntryDetail,
  type BankEntryLog,
  type BankEntryLedger,
} from './bankEntryDetailParser'
import type { BankBudget } from './bankBudget.types'
import type { BankTransactionCategoryList } from './bankTransactionCateg.types'
import { stripTags } from '../../utils/text'

// bank-sidebar-list-ajax.php and loan-sidebar-list-ajax.php are the generic
// *-sidebar-list-ajax.php template (Users Groups/Tags use it too): a
// hardcoded length=25 page size and no permission check (any logged-in user
// can call them). categories/tag-sidebarlist-ajax.php is the generic tag
// list used for Users Tags, here with type_id=5 (Categorie::TYPE_ACCOUNT).

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
      try {
        // compta/bank/fapi/list.php carries the bank name too.
        return (await listBankAccounts()).map((a) => ({ id: a.id, label: a.label, ref: a.ref, bank: a.bank ?? '' }))
      } catch (error) {
        if (!isMissingEndpoint(error)) throw error
      }
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
async function fetchBankSidebarPage(start: number): Promise<RawSidebarListResponse<RawBankAccountRow>> {
  const res = await fetch(`/compta/bank/bank-sidebar-list-ajax.php?draw=1&start=${start}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return parseLegacyJson<RawSidebarListResponse<RawBankAccountRow>>(res)
}

function mapBankSidebarRows(page: RawSidebarListResponse<RawBankAccountRow>): BankAccountRow[] {
  return page.data.map((r) => ({
    id: Number(r.rowid),
    label: r.label,
    accountNumber: r.number ?? '',
    currencyCode: r.currency_code,
    balance: Number(r.totbank ?? 0),
  }))
}

// bank-sidebar-list-ajax.php returns one fixed-size page of accounts per request
// (25 on the local backend, more on newer ones; `start` is the offset). Its
// recordsTotal is NOT the number of accounts (it is the bank-line count of the
// first account), so the pages are read until one comes back short. Without
// this, any account past the first page (e.g. id 89 on the demo backend) was
// "not found" on its detail page. Screens that only need a glimpse (the Home
// dashboard) use useBankAccountsFirstPage instead.
const BANK_SIDEBAR_FULL_PAGE = 25
const BANK_SIDEBAR_MAX_PAGES = 40
// compta/bank/fapi/list.php answers with every account and its balance in one JSON call, so
// the paging below only applies to a backend that does not have it.
async function fetchBankAccountsFromApi(): Promise<BankAccountRow[] | null> {
  try {
    return (await listBankAccounts({ withBalance: true })).map((a) => ({
      id: a.id,
      label: a.label,
      accountNumber: a.number || a.account_number || '',
      currencyCode: a.currency,
      balance: Number(a.balance ?? 0),
    }))
  } catch (error) {
    if (isMissingEndpoint(error)) return null
    throw error
  }
}

export function useBankAccountsList() {
  return useQuery({
    queryKey: ['banking', 'accounts', 'list'],
    queryFn: async (): Promise<BankAccountRow[]> => {
      const fromApi = await fetchBankAccountsFromApi()
      if (fromApi) return fromApi
      const all: BankAccountRow[] = []
      for (let page = 0; page < BANK_SIDEBAR_MAX_PAGES; page++) {
        const rows = (await fetchBankSidebarPage(all.length)).data
        if (rows.length === 0) break
        all.push(...mapBankSidebarRows({ recordsTotal: '', recordsFiltered: '', data: rows }))
        if (rows.length < BANK_SIDEBAR_FULL_PAGE) break
      }
      return all
    },
    staleTime: 1000 * 30,
  })
}

// Only the first page of accounts: one request, however many accounts exist.
export function useBankAccountsFirstPage() {
  return useQuery({
    queryKey: ['banking', 'accounts', 'first-page'],
    queryFn: async (): Promise<BankAccountRow[]> => (await fetchBankAccountsFromApi()) ?? mapBankSidebarRows(await fetchBankSidebarPage(0)),
    staleTime: 1000 * 30,
  })
}

// compta/bank/fapi/list.php?detail=1 — the Bank Management Details table with every column (type, accounting account, journal,
// entries to reconcile, status, balance). Only open accounts unless asked (`status=closed|all`).
export type BankAccountStatusFilter = 'opened' | 'closed' | 'all'

export function useBankAccountsDetailedList(status: BankAccountStatusFilter) {
  return useQuery({
    queryKey: ['banking', 'accounts', 'detailed', status],
    // compta/bank/fapi/list.php?detail=1 carries every column of the management table (see bankingFapi.ts)
    queryFn: (): Promise<BankAccountListRow[]> => loadBankAccountsDetailed(status),
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
  // The cell's own trailing <small> subtitle (e.g. "Voxforem Technologies"
  // under a contact named "customer1") — the contact's parent company
  // affiliation. Undefined when the cell has none.
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

export interface BankEntriesFilters {
  search?: string
  dateOpsFrom?: string
  dateOpsTo?: string
  dateValueFrom?: string
  dateValueTo?: string
  unreconciledOnly?: boolean
}
export function useBankEntriesList(accountId: number | undefined, page: number, length: number, filters?: BankEntriesFilters) {
  return useQuery({
    queryKey: ['banking', 'entries', 'fapi', accountId, page, length, filters ?? null],
    // compta/bank/fapi/entries.php: the lines newest first with their running balance, filtered by account, operation / value date, text and state
    queryFn: (): Promise<{ rows: BankEntryRow[]; total: number; filtered: number }> => loadBankEntries(accountId, page, length, filters),
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
// Total of unreconciled bank lines across ALL accounts in one request: the same
// list endpoint without `search_account` counts every account, so the Home
// dashboard needs no per-account request.
export function useUnreconciledEntriesTotal() {
  return useQuery({
    queryKey: ['banking', 'entries', 'unreconciled-total', 'fapi'],
    queryFn: () => countUnreconciled(),
    staleTime: 1000 * 30,
  })
}

export function useReconcileCounts(accountIds: number[]) {
  return useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['banking', 'accounts', 'reconcile-count', 'fapi', id],
      queryFn: () => countUnreconciled(id),
      staleTime: 1000 * 30,
    })),
  })
}

// ── Categories (categories/tag-sidebarlist-ajax.php?type_id=5) — the
// generic llx_categorie list also used for Users Tags, here for
// Categorie::TYPE_ACCOUNT (=5) ────────────────────────────
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
export function useLoanList() {
  return useQuery({
    queryKey: ['banking', 'loans', 'list', 'fapi'],
    // loan/fapi/loans.php (the row shape is the document's own: no loans on newecuenta to capture)
    queryFn: (): Promise<LoanRow[]> => loadLoanList(),
    staleTime: 1000 * 30,
  })
}

// The "Checks Awaiting Deposit" count of the cheque deposits area (compta/paiement/fapi/cheque_deposits.php)
export function useChequeArea() {
  return useQuery({
    queryKey: ['banking', 'cheques', 'area'],
    queryFn: loadChequeArea,
    staleTime: 1000 * 30,
  })
}

// ── Account Statements, Graphics and Monthly Reporting (compta/bank/fapi/statements.php and stats.php)
export function useBankStatements(accountId: number | undefined) {
  return useQuery({
    queryKey: ['banking', 'accounts', 'detail', accountId, 'statements'],
    queryFn: () => loadBankStatements(accountId as number),
    enabled: accountId !== undefined,
  })
}

export function useBankStatsDay(accountId: number | undefined, year: number, month: number) {
  return useQuery({
    queryKey: ['banking', 'accounts', 'detail', accountId, 'stats', 'day', year, month],
    queryFn: () => loadBankStatsDay(accountId as number, year, month),
    enabled: accountId !== undefined,
  })
}

export function useBankStatsMonth(accountId: number | undefined, year: number) {
  return useQuery({
    queryKey: ['banking', 'accounts', 'detail', accountId, 'stats', 'month', year],
    queryFn: () => loadBankStatsMonth(accountId as number, year),
    enabled: accountId !== undefined,
  })
}

export function useBankStatsType(accountId: number | undefined) {
  return useQuery({
    queryKey: ['banking', 'accounts', 'detail', accountId, 'stats', 'type'],
    queryFn: () => loadBankStatsType(accountId as number),
    enabled: accountId !== undefined,
  })
}

// ── Linked Files: the attached files are listed and removed through compta/bank/fapi/documents.php
export function useBankDocuments(accountId: number | undefined) {
  return useQuery({
    queryKey: ['banking', 'accounts', 'detail', accountId, 'documents'],
    queryFn: () => loadBankDocuments(accountId as number),
    enabled: accountId !== undefined,
  })
}

export function useDeleteBankDocument(accountId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: string) => deleteBankDocument(accountId as number, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'accounts', 'detail', accountId, 'documents'] }),
  })
}

// Upload and link stay on compta/bank/document.php — real actions from
// core/actions_linkedfiles.inc.php, the exact same generic upload/link
// handler already confirmed and used for Project Documents
// (see projectDocuments.queries.ts): document.php includes it directly
// (confirmed by reading the source) with no CSRF check either. Field names
// are the same generic ones: Upload = sendit=1 + userfile=<File>; Link =
// linkit=1 + link=<url> + label=<label>. documents.php documents no upload
// or link body.
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

// ── New Financial Account (compta/bank/fapi/account.php): the form options (GET) and the create (POST ?action=create)
export function useBankAccountFormOptions() {
  return useQuery({
    queryKey: ['banking', 'accounts', 'createFormOptions', 'fapi'],
    queryFn: (): Promise<BankAccountFormContext> => loadAccountOptions(),
    staleTime: 1000 * 60 * 10,
  })
}

export type NewBankAccountInput = NewBankAccountBody

// Resolves with the new account's id when the answer carries one (it is not documented), else undefined.
export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewBankAccountInput): Promise<number | undefined> => createBankAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking', 'accounts'] })
    },
  })
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
      // compta/bank/fapi/entry.php (+ transfer.php for the account and payment type lists, categories.php for the tags)
      return loadBankEntryDetail(rowid)
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
    queryFn: (): Promise<BankEntryLog> => loadBankEntryLog(rowid as number),
    enabled: enabled && rowid !== undefined,
  })
}

export function useBankEntryLedger(rowid: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['banking', 'entries', 'ledger', rowid],
    queryFn: (): Promise<BankEntryLedger> => loadBankEntryLedger(rowid as number),
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
    queryFn: (): Promise<BankBudget> => loadBankBudget(),
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

export function useCreateInternalTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    // compta/bank/fapi/transfer.php?action=create: two bank lines and their cross-links in one transaction (422 / 404 / 409 come back as messages)
    mutationFn: (input: NewInternalTransferInput): Promise<void> => createInternalTransfer(input),
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
// bankTransactionCateg.types.ts.
export function useBankTransactionCategories() {
  return useQuery({
    queryKey: ['banking', 'transactionCategories'],
    queryFn: (): Promise<BankTransactionCategoryList> => loadBankTransactionCategories(),
  })
}

export function useAddBankTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (label: string): Promise<void> => {
      await addBankTransactionCategory(label)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'transactionCategories'] }),
  })
}

export function useUpdateBankTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, label }: { id: number; label: string }): Promise<void> => {
      await updateBankTransactionCategory(id, label)
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
      await deleteBankTransactionCategory(id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banking', 'transactionCategories'] }),
  })
}
