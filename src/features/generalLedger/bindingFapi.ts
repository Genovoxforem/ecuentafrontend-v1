import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { requireJson } from '../salesOrders/orderApi'
import { formatMoney } from '../../utils/format'
import type { BindLine, BindLinesPage } from './bindLinesParser'
import type { BoundLine, BoundLinesPage } from './boundLinesParser'

// The invoice-line binding surfaces on accountancy/fapi/binding_customer.php and binding_vendor.php (22 Oct 2026): the lines still to bind
// (action=to_dispatch), the lines already bound (action=dispatched) and the bind / unbind writes. The customer answers were captured from
// newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-bind-*.json; one line was bound, read back and unbound again). The vendor side holds
// no invoices there, so its line shape is the document's "BindLine + invoiceRefSupplier, invoiceLabel" and has not been seen live.
// binding_expensereport.php is not wired: its to_dispatch answers 500 "Could not count the expense-report lines" (listed in the bug report).

type Kind = 'customer' | 'vendor'
const FILE: Record<Kind, string> = { customer: '/accountancy/fapi/binding_customer.php', vendor: '/accountancy/fapi/binding_vendor.php' }

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
    taxRate: str(i.taxRate),
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
    taxRate: str(i.taxRate),
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

export async function bindLines(kind: Kind, selections: Array<{ lineId: string; account: string }>): Promise<string> {
  const res = await fapiPost<WriteResult>(FILE[kind], bindBody(selections), { action: 'bind' })
  return `${res.updated} line(s) bound.`
}

// "Change the binding": account "0" removes the binding, any other account is bound in place of the current one.
export async function rebindLines(kind: Kind, lineIds: string[], account: string): Promise<string> {
  if (account === '0') {
    const res = await fapiPost<WriteResult>(FILE[kind], { line_ids: lineIds.map(Number) }, { action: 'unbind' })
    return `${res.updated} line(s) unbound.`
  }
  const res = await fapiPost<WriteResult>(FILE[kind], bindBody(lineIds.map((lineId) => ({ lineId, account }))), { action: 'bind' })
  return `${res.updated} line(s) bound.`
}

export const bindKindOf = (path: string): Kind | null => (/supplier/.test(path) ? 'vendor' : /customer/.test(path) ? 'customer' : null)
