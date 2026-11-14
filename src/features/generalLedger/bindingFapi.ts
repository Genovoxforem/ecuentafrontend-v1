import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fetchAllPages } from '../../api/fapiRow'
import { requireJson } from '../salesOrders/orderApi'
import { formatMoney } from '../../utils/format'
import { usDateFromIso } from '../../utils/dates'
import type { BindLine, BindLinesPage } from './bindLines.types'
import type { BindExpenseLine, BindExpenseLinesPage } from './bindExpenseLines.types'
import type { BoundLine, BoundLinesPage } from './boundLines.types'
import type { BoundExpenseLine, BoundExpenseLinesPage } from './boundExpenseLines.types'

// The invoice-line binding surfaces on accountancy/fapi/binding_customer.php and binding_vendor.php (22 Oct 2026): the lines still to bind
// (action=to_dispatch), the lines already bound (action=dispatched) and the bind / unbind writes. The customer answers were captured from
// newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-bind-*.json; one line was bound, read back and unbound again). The vendor side holds
// no invoices there, so its line shape is the document's "BindLine + invoiceRefSupplier, invoiceLabel" and has not been seen live.
// The expense-report lines are on binding_expensereport.php (same actions; its to_dispatch answered 500 on 22 Oct, BUG-73, and answers 200 now).
// newecuenta holds no expense report, so its answers were read on 172.16.5.10 (22 expense reports there, 19 lines bound, 1 to bind) and compared
// with that server's classic accountancy/expensereport/lines.php and list.php, GET only, on 6 Nov 2026:
//   - dispatched: 19 lines in the API and 19 in the classic page, the same line ids; report ref, date, fee type, description, amount and account
//     are equal on every line. Two differences: the classic page lists the lines by line id, newest first (26, 22, 21 ... 2), where the API
//     answers by report date and then line id (26, 17 ... 22, 2 ... 14), so the page sorts the lines itself; and the classic tax cell reads
//     "0 (C1)" (rate and VAT code) where the API gives the rate only (0);
//   - to_dispatch: 1 line on both, equal on every field above; the classic order of several lines could not be seen (a single line);
//   - the employee photo is a bare file name ("DP.jpg"), not a URL, so the page shows the avatar with initials.
// Since 11 Nov 2026 the three binding endpoints (the shared _bind_common.php) also answer the country in English ("Zambia", it was the French dictionary label
// "Zambie") and vatCode ("A") with taxLabel ("16 (A)", the rate and its VAT code, the way the classic tax cell reads); taxRate stays the bare number. The tax cell
// prints taxLabel, and the bare rate against a server that does not send it. Read live on binding_customer.php?action=to_dispatch (132 lines); the dispatched,
// vendor and expense-report answers hold no line on newecuenta, so taxLabel is not seen there.
// The bind / unbind writes were NOT run against an expense report (none on newecuenta); they send the body the customer variant was
// exercised with (the document: "same actions on binding_vendor.php / binding_expensereport.php").

type Kind = 'customer' | 'vendor'
const FILE: Record<Kind, string> = { customer: '/accountancy/fapi/binding_customer.php', vendor: '/accountancy/fapi/binding_vendor.php' }
type WriteKind = Kind | 'expense'
const EXPENSE_FILE = '/accountancy/fapi/binding_expensereport.php'
const WRITE_FILE: Record<WriteKind, string> = { ...FILE, expense: EXPENSE_FILE }

interface FapiBindItem {
  lineId: number
  invoiceId: number
  invoiceRef: string
  invoiceRefSupplier?: string
  date: string | null
  productId: number | null
  productName: string | null
  productRef: string | null
  description: string | null
  amount: number
  taxRate: number
  vatCode?: string
  taxLabel?: string
  thirdPartyId: number
  thirdParty: string
  country: string | null
  vatId: string | null
  defaultAccount?: string
  productAccount?: string
  selectedAccount?: number | null
  account?: string
  accountId?: number
}
interface FapiBindList {
  items: FapiBindItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

const str = (v: string | number | null | undefined) => (v == null ? '' : String(v))

// ---- the accounts a line can be bound to: the chart tree (coa.php?action=tree answers a bare array, no envelope) ----------------------

interface CoaNode {
  id: string
  text: string
  items?: CoaNode[]
}

export function accountOptions(tree: CoaNode[]): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = []
  const walk = (nodes: CoaNode[]) => {
    for (const n of nodes) {
      // "<number>-<label>" -> "<number> - <label>"
      out.push({ value: n.id, label: n.text.replace('-', ' - ') })
      if (n.items) walk(n.items)
    }
  }
  walk(tree)
  return out
}

let chart: Promise<Array<{ value: string; label: string }>> | null = null
export function loadBindableAccounts(): Promise<Array<{ value: string; label: string }>> {
  chart ??= fapi
    .get<CoaNode[]>('/accountancy/fapi/coa.php', { params: { action: 'tree' } })
    .then((res) => accountOptions(requireJson(res).data))
    .catch((e) => {
      chart = null
      throw e
    })
  return chart
}

// ---- lines to bind -------------------------------------------------------------------------------------------------------------------

export function mapBindLines(d: FapiBindList, accounts: Array<{ value: string; label: string }>, limit: number): BindLinesPage {
  const rows: BindLine[] = d.items.map((i) => ({
    lineId: String(i.lineId),
    selectValue: `${i.lineId}_0`,
    invoiceId: String(i.invoiceId),
    invoiceRef: i.invoiceRefSupplier || i.invoiceRef,
    date: str(i.date),
    productId: str(i.productId),
    productName: str(i.productName),
    productRef: str(i.productRef),
    description: str(i.description),
    amount: formatMoney(i.amount),
    taxRate: i.taxLabel || str(i.taxRate),
    thirdPartyId: String(i.thirdPartyId),
    thirdParty: i.thirdParty,
    country: str(i.country),
    vatId: str(i.vatId),
    defaultAccount: str(i.defaultAccount),
    productAccount: str(i.productAccount),
    selectedAccount: str(i.selectedAccount),
  }))
  return {
    token: '',
    info: '',
    limit,
    page: d.pagination.page - 1,
    pageCount: Math.max(1, d.pagination.pages),
    sortfield: '',
    sortorder: '',
    accounts: [{ value: '', label: '' }, ...accounts],
    rows,
  }
}

export async function loadBindLines(kind: Kind, limit: number, page: number): Promise<BindLinesPage> {
  const [list, accounts] = await Promise.all([fapiGet<FapiBindList>(FILE[kind], { action: 'to_dispatch', limit, page: page + 1 }), loadBindableAccounts()])
  return mapBindLines(list, accounts, limit)
}

// ---- lines already bound -------------------------------------------------------------------------------------------------------------

export function mapBoundLines(d: FapiBindList, accounts: Array<{ value: string; label: string }>, limit: number): BoundLinesPage {
  const rows: BoundLine[] = d.items.map((i) => ({
    lineId: String(i.lineId),
    invoiceId: String(i.invoiceId),
    invoiceRef: i.invoiceRefSupplier || i.invoiceRef,
    date: str(i.date),
    productId: str(i.productId),
    productName: str(i.productName),
    productRef: str(i.productRef),
    description: str(i.description),
    amount: formatMoney(i.amount),
    taxRate: i.taxLabel || str(i.taxRate),
    thirdPartyId: String(i.thirdPartyId),
    thirdParty: i.thirdParty,
    country: str(i.country),
    vatId: str(i.vatId),
    account: str(i.account),
  }))
  return {
    token: '',
    info: '',
    limit,
    page: d.pagination.page - 1,
    pageCount: Math.max(1, d.pagination.pages),
    accounts: [{ value: '0', label: '--- None ---' }, ...accounts],
    rows,
  }
}

export async function loadBoundLines(kind: Kind, limit: number, page: number): Promise<BoundLinesPage> {
  const [list, accounts] = await Promise.all([fapiGet<FapiBindList>(FILE[kind], { action: 'dispatched', limit, page: page + 1 }), loadBindableAccounts()])
  return mapBoundLines(list, accounts, limit)
}

// ---- writes --------------------------------------------------------------------------------------------------------------------------

interface WriteResult {
  action: string
  updated: number
}

export const bindBody = (selections: Array<{ lineId: string; account: string }>) => ({
  lines: selections.map((s) => ({ line_id: Number(s.lineId), account_number: s.account })),
})

export async function bindLines(kind: WriteKind, selections: Array<{ lineId: string; account: string }>): Promise<string> {
  const res = await fapiPost<WriteResult>(WRITE_FILE[kind], bindBody(selections), { action: 'bind' })
  return `${res.updated} line(s) bound.`
}

// "Change the binding": account "0" removes the binding, any other account is bound in place of the current one.
export async function rebindLines(kind: WriteKind, lineIds: string[], account: string): Promise<string> {
  if (account === '0') {
    const res = await fapiPost<WriteResult>(WRITE_FILE[kind], { line_ids: lineIds.map(Number) }, { action: 'unbind' })
    return `${res.updated} line(s) unbound.`
  }
  const res = await fapiPost<WriteResult>(WRITE_FILE[kind], bindBody(lineIds.map((lineId) => ({ lineId, account }))), { action: 'bind' })
  return `${res.updated} line(s) bound.`
}

export const bindKindOf = (path: string): Kind | null => (/supplier/.test(path) ? 'vendor' : /customer/.test(path) ? 'customer' : null)
// The kind a bind / unbind write goes to: the invoice lines and the expense-report lines.
export const writeKindOf = (path: string): WriteKind | null => (/expensereport/.test(path) ? 'expense' : bindKindOf(path))

// ---- expense-report lines (binding_expensereport.php) ---------------------------------------------------------------------------------

interface FapiExpenseItem {
  lineId: number
  employee: string
  employeeId: number
  reportId: number
  reportRef: string
  date: string | null
  feeType: string | null
  description: string | null
  amount: number
  taxRate: number
  vatCode?: string
  taxLabel?: string
  suggestedAccount?: string
  selectedAccount?: number | null
  checked?: boolean
  account?: string
}

export function mapBindExpenseLines(items: FapiExpenseItem[], accounts: Array<{ value: string; label: string }>): BindExpenseLinesPage {
  const rows: BindExpenseLine[] = items.map((i) => ({
    lineId: String(i.lineId),
    selectValue: `${i.lineId}_0`,
    employee: i.employee,
    employeeId: String(i.employeeId),
    employeePhoto: '',
    reportId: String(i.reportId),
    reportRef: i.reportRef,
    date: usDateFromIso(i.date),
    feeType: str(i.feeType),
    description: str(i.description),
    amount: formatMoney(i.amount),
    taxRate: i.taxLabel || str(i.taxRate),
    suggestedAccount: str(i.suggestedAccount),
    selectedAccount: str(i.selectedAccount),
    checked: i.checked === true,
  }))
  return { token: '', info: '', sortfield: '', sortorder: '', accounts: [{ value: '', label: '' }, ...accounts], rows }
}

export async function loadBindExpenseLines(limit: number, page: number): Promise<BindExpenseLinesPage> {
  const [list, accounts] = await Promise.all([fapiGet<{ items: FapiExpenseItem[] }>(EXPENSE_FILE, { action: 'to_dispatch', limit, page: page + 1 }), loadBindableAccounts()])
  return mapBindExpenseLines(list.items, accounts)
}

// The classic page lists the bound lines by line id, newest first, and the API does not answer in that order, so the lines are all read,
// sorted and cut into pages here (an entity holds a few dozen expense-report lines, not thousands).
export function mapBoundExpenseLines(items: FapiExpenseItem[], accounts: Array<{ value: string; label: string }>, limit: number, page: number): BoundExpenseLinesPage {
  const sorted = [...items].sort((a, b) => b.lineId - a.lineId)
  const rows: BoundExpenseLine[] = sorted.slice(page * limit, page * limit + limit).map((i) => ({
    lineId: String(i.lineId),
    employee: i.employee,
    employeeId: String(i.employeeId),
    employeePhoto: '',
    reportId: String(i.reportId),
    reportRef: i.reportRef,
    validationDate: '',
    date: usDateFromIso(i.date),
    feeType: str(i.feeType),
    description: str(i.description),
    amount: formatMoney(i.amount),
    taxRate: i.taxLabel || str(i.taxRate),
    account: str(i.account),
  }))
  return { token: '', info: '', limit, page, pageCount: Math.max(1, Math.ceil(sorted.length / limit)), accounts: [{ value: '0', label: '--- None ---' }, ...accounts], rows }
}

export async function loadBoundExpenseLines(limit: number, page: number): Promise<BoundExpenseLinesPage> {
  const [items, accounts] = await Promise.all([
    fetchAllPages<FapiExpenseItem>((p) => fapiGet<{ items?: FapiExpenseItem[]; pagination?: { pages?: number } }>(EXPENSE_FILE, { action: 'dispatched', limit: 200, page: p })),
    loadBindableAccounts(),
  ])
  return mapBoundExpenseLines(items, accounts, limit, page)
}
