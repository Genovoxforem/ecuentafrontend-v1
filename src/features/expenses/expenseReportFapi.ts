import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import { dmy } from './expenseFapi'
import type { ExpenseReportEvents, ExpenseReportLedgerData } from './expenseReportTabsParser'

// The Events and LedgerEntry tabs of the classic expense report (expensereport/fapi/events.php, ledgerentry.php), replacing the scraped
// expensereport/info.php and ledgerentry.php pages. newecuenta holds no expense report, so both answers are the document's own shape
// ("from code"); a live call for any id is a 404 "Expense report not found".

type Stamp = { date: string | null; user: { id: number; login: string; fullname: string } | null }
export interface FapiExpenseReportEvents {
  info: { created: Stamp; modified: Stamp; validated: Stamp; approved: Stamp }
}

// The classic page prints "26/10/2026 08:59 AM": the date and the wall-clock time of the stamp (the offset in the stamp is kept as it is).
export function dmyHm(iso: string | null | undefined): string {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return dmy(iso)
  const h = Number(m[4])
  return `${m[3]}/${m[2]}/${m[1]} ${String(h % 12 || 12).padStart(2, '0')}:${m[5]} ${h >= 12 ? 'PM' : 'AM'}`
}

const userUrl = (s: Stamp) => (s.user ? `/userprofile/index.php?id=${s.user.id}` : null)

export const mapExpenseReportEvents = (d: FapiExpenseReportEvents): ExpenseReportEvents => ({
  creationDate: d.info.created.date ? dmyHm(d.info.created.date) : '',
  modifiedBy: d.info.modified.user?.fullname ?? '',
  modifiedByUrl: userUrl(d.info.modified),
  latestModificationDate: d.info.modified.date ? dmyHm(d.info.modified.date) : '',
  approvedBy: d.info.approved.user?.fullname ?? '',
  approvedByUrl: userUrl(d.info.approved),
})
export const loadExpenseReportEvents = async (id: string) => mapExpenseReportEvents(await fapiGet<FapiExpenseReportEvents>('/expensereport/fapi/events.php', { id }))

export interface FapiExpenseReportLedger {
  rows: Array<{ date: string; piece_num: number | string; doc_ref: string; code_journal: string; account: string; label: string; debit: number; credit: number; amount: number }>
  totals: { debit: number; credit: number; balance: number }
}
const cell = (n: number) => (n ? formatMoney(n) : '')

export const mapExpenseReportLedger = (d: FapiExpenseReportLedger): ExpenseReportLedgerData => ({
  columns: ['Date', 'Accounting Doc.', 'Ref.', 'CodeJournal', 'Account', 'Label', 'Debit', 'Credit', 'Amount'],
  rows: d.rows.map((r) => ({ cells: [dmy(r.date), String(r.piece_num), r.doc_ref, r.code_journal, r.account, r.label, cell(r.debit), cell(r.credit), formatMoney(r.amount)] })),
  balance: { debit: formatMoney(d.totals.debit), credit: formatMoney(d.totals.credit), amount: formatMoney(d.totals.balance) },
})
export const loadExpenseReportLedger = async (id: string) => mapExpenseReportLedger(await fapiGet<FapiExpenseReportLedger>('/expensereport/fapi/ledgerentry.php', { id }))
