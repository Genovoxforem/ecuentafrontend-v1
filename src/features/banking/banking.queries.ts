import { useQuery } from '@tanstack/react-query'

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
  conciliated: boolean
}
interface RawBankEntriesResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  data: string[][]
  error?: string
}
export function useBankEntriesList(accountId: number | undefined, page: number, length: number) {
  return useQuery({
    queryKey: ['banking', 'entries', accountId, page, length],
    queryFn: async (): Promise<{ rows: BankEntryRow[]; total: number; filtered: number }> => {
      const params = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      if (accountId) params.set('search_account', String(accountId))
      const res = await fetch(`/compta/bank/bankentries_list_ajax.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawBankEntriesResponse = await res.json()
      if (data.error) throw new Error(data.error)
      const rows: BankEntryRow[] = data.data.map((cells, i) => ({
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
        conciliated: stripTags(cells[13] ?? '').toLowerCase() === 'yes',
      }))
      return { rows, total: data.recordsTotal, filtered: data.recordsFiltered }
    },
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
