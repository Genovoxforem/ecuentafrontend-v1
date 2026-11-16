import type { BankAccountFormOption } from './bankAccountForm.types'

// The bank entry card: the types the screen renders (filled from compta/bank/fapi/entry.php, see bankingFapi.ts) and the date helpers of its form. The classic line.php page is not parsed any more.

export interface BankEntryLink {
  label: string
  // Recognized link kinds get routed in-app; anything else still renders,
  // just without a working href.
  kind: 'thirdparty' | 'payment' | 'entry' | 'other'
  id?: number
}

export interface BankEntryCategoryOption {
  value: string
  label: string
  selected: boolean
}

export interface BankEntryDetail {
  token: string
  rowid: number
  // Header strip — "Account: Bank008 (Bank008) | Amount: 100.00 ZMW |
  // Operation date: 07/20/2026" — read once here rather than re-derived from
  // the form fields below, since the real page shows this exact wording.
  headerAccountLabel: string
  headerAmount: string
  headerOperationDate: string
  accountedInLedger: boolean
  links: BankEntryLink[]
  accountId: string
  accountOptions: BankAccountFormOption[]
  paymentType: string
  paymentTypeOptions: BankAccountFormOption[]
  checkNum: string
  transmitter: string
  bankOfCheck: string
  dateOps: string // MM/DD/YYYY, as the real form's own text field shows it
  dateValue: string
  label: string
  amount: string
  currencyLabel: string
  categoryOptions: BankEntryCategoryOption[]
  reconcileStatement: string
  reconciled: boolean
}

// MM/DD/YYYY (the real form's own display format) -> Dolibarr's day/month/year
// hidden-field triplet, needed alongside the plain text field for the real
// action=update POST (see useCreateBankAccount in banking.queries.ts for
// the same re/reday/remonth/reyear pattern).
export function splitMdy(mdy: string): { day: string; month: string; year: string } {
  const [month, day, year] = mdy.split('/')
  return { day: day ?? '', month: month ?? '', year: year ?? '' }
}

// BankEntryDetail.tsx uses a native <input type="date"> (yyyy-mm-dd) for
// Operation/Value date instead of replicating the real page's jQuery
// datepicker text field — these convert between that and the MM/DD/YYYY the
// parsed detail data / the real form's own fields use.
export function mdyToIso(mdy: string): string {
  const { day, month, year } = splitMdy(mdy)
  if (!day || !month || !year) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function isoToMdy(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return ''
  return `${month}/${day}/${year}`
}

// ── Log tab (compta/bank/info.php?rowid=N) — no JSON API, real read-only
// page: who created/last-modified this entry and when, plus the same
// accounted-in-ledger status shown a second way ("Not yet accounted in
// ledger" vs — not yet seen live — presumably "Accounted in ledger").
export interface BankEntryLog {
  accountedStatusText: string
  createdByName: string
  createdByUserId?: number
  creationDate: string
  lastModificationDate: string
}

// ── LedgerEntry tab (compta/bank/ledgerentry.php?rowid=N) — read-only page:
// the accounting-ledger rows this bank entry has been posted to. The per-row
// cell shape below follows the table's own <thead> column order; not
// verified against a populated row.
export interface BankEntryLedgerRow {
  date: string
  accountingDoc: string
  ref: string
  codeJournal: string
  account: string
  label: string
  debit: string
  credit: string
  amount: string
}

export interface BankEntryLedger {
  rows: BankEntryLedgerRow[]
  totalDebit: string
  totalCredit: string
  totalAmount: string
}
