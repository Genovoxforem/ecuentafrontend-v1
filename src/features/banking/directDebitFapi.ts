import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import { mdy } from './bankingFapi'

// Direct debit on compta/prelevement/fapi (26 Oct 2026): summary.php, orders.php (lines, candidates, create) and requests.php (requests, rejects).
// Every list is empty on newecuenta. The documented row shapes ("from code") are typed exactly below (order lines, requests); the rows the
// document gives no shape for (waiting invoices, latest orders, the by-status and by-motif statistics, candidates, rejects) are read under the
// field names the same document uses for the same things and left blank when a field is absent. None has been seen with a live row.

type Row = Record<string, unknown>
const str = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k]
    if (v !== undefined && v !== null && v !== '') return String(v)
  }
  return ''
}
const num = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}
const amt = (n: number | null) => (n === null ? '' : formatMoney(n))

export interface FapiPaged<T> {
  items: T[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

// ---- Order lines: orders.php ------------------------------------------------------------------------------------------------------------------

export interface FapiDdOrderLine {
  line_id: number
  line_number: string
  line_status_label: string
  order_id: number
  order_ref: string
  date_created: string
  invoice_id: number
  invoice_ref: string
  thirdparty_id: number
  thirdparty_name: string
  thirdparty_code: string
  amount: number
}
export interface DdOrderLineRow {
  id: number
  line: string
  invoiceId: number
  invoice: string
  companyId: number
  company: string
  customerCode: string
  date: string
  amount: string
}
export const mapDdOrderLines = (d: FapiPaged<FapiDdOrderLine>): DdOrderLineRow[] =>
  d.items.map((l) => ({
    id: l.line_id,
    line: l.line_number,
    invoiceId: l.invoice_id,
    invoice: l.invoice_ref,
    companyId: l.thirdparty_id,
    company: l.thirdparty_name,
    customerCode: l.thirdparty_code ?? '',
    date: mdy(l.date_created),
    amount: formatMoney(l.amount),
  }))
export const loadDdOrderLines = async () => mapDdOrderLines(await fapiGet<FapiPaged<FapiDdOrderLine>>('/compta/prelevement/fapi/orders.php'))

// ---- Requests and rejects: requests.php ------------------------------------------------------------------------------------------------------

export interface FapiDdRequest {
  request_id: number
  invoice_id: number
  invoice_ref: string
  thirdparty_id: number
  thirdparty_name: string
  amount_requested: number
  date_request: string
}
export interface DdRequestRow {
  id: number
  invoiceId: number
  invoice: string
  companyId: number
  company: string
  amountRequested: string
  date: string
}
export const mapDdRequests = (d: FapiPaged<FapiDdRequest>): DdRequestRow[] =>
  d.items.map((r) => ({
    id: r.request_id,
    invoiceId: r.invoice_id,
    invoice: r.invoice_ref,
    companyId: r.thirdparty_id,
    company: r.thirdparty_name,
    amountRequested: formatMoney(r.amount_requested),
    date: mdy(r.date_request),
  }))
export const loadDdRequests = async () => mapDdRequests(await fapiGet<FapiPaged<FapiDdRequest>>('/compta/prelevement/fapi/requests.php'))

export interface DdRejectRow {
  key: string
  line: string
  company: string
  reason: string
}
export const mapDdRejects = (d: FapiPaged<Row>): DdRejectRow[] =>
  d.items.map((r, i) => ({
    key: str(r, 'line_id', 'id') || String(i),
    line: str(r, 'line_number', 'line_id', 'id'),
    company: str(r, 'thirdparty_name', 'company'),
    reason: str(r, 'motif_label', 'motif', 'reject_motif', 'reason'),
  }))
export const loadDdRejects = async () => mapDdRejects(await fapiGet<FapiPaged<Row>>('/compta/prelevement/fapi/requests.php', { view: 'rejects' }))

// ---- Area and statistics: summary.php ----------------------------------------------------------------------------------------------------------

export interface FapiDdSummary {
  statistics: { invoices_to_withdraw: number; amount_to_withdraw: number; currency: string }
  invoices_waiting: Row[]
  invoices_waiting_count: number
  latest_orders: Row[]
  stats: {
    totals: { count: number; amount: number; currency: string }
    by_status: Row[]
    rejects_totals: { count: number; amount: number }
    by_reject_motif: Row[]
  }
}
export interface DdWaitingRow {
  key: string
  invoiceId: number | null
  invoice: string
  company: string
  amount: string
  date: string
}
export interface DdLatestRow {
  key: string
  ref: string
  date: string
  amount: string
  status: string
}
export interface DdStatRow {
  label: string
  count: number
  countPct: string
  amount: string
  amountPct: string
}
export interface DdSummary {
  toWithdrawCount: number
  toWithdrawAmount: string
  currency: string
  waitingCount: number
  waiting: DdWaitingRow[]
  latest: DdLatestRow[]
  byStatus: DdStatRow[]
  total: { count: number; amount: string }
  rejects: DdStatRow[]
  rejectsTotal: { count: number; amount: string }
}

const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(2)}` : '0.00')
const statRows = (rows: Row[], total: { count: number; amount: number }): DdStatRow[] =>
  rows.map((r) => {
    const count = num(r, 'count', 'number') ?? 0
    const amount = num(r, 'amount', 'total') ?? 0
    return { label: str(r, 'status_label', 'label', 'motif_label', 'motif', 'status'), count, countPct: pct(count, total.count), amount: formatMoney(amount), amountPct: pct(amount, total.amount) }
  })

export function mapDdSummary(d: FapiDdSummary): DdSummary {
  const totals = d.stats.totals
  return {
    toWithdrawCount: d.statistics.invoices_to_withdraw,
    toWithdrawAmount: formatMoney(d.statistics.amount_to_withdraw),
    currency: d.statistics.currency,
    waitingCount: d.invoices_waiting_count,
    waiting: d.invoices_waiting.map((r, i) => ({
      key: str(r, 'invoice_id', 'request_id', 'id') || String(i),
      invoiceId: num(r, 'invoice_id'),
      invoice: str(r, 'invoice_ref', 'ref'),
      company: str(r, 'thirdparty_name', 'company'),
      amount: amt(num(r, 'amount_requested', 'invoice_total_ttc', 'amount')),
      date: mdy(str(r, 'date_request')),
    })),
    latest: d.latest_orders.map((r, i) => ({
      key: str(r, 'order_id', 'id') || String(i),
      ref: str(r, 'order_ref', 'ref'),
      date: mdy(str(r, 'date_created', 'date_creation', 'date')),
      amount: amt(num(r, 'amount', 'total')),
      status: str(r, 'order_status_label', 'status_label', 'status'),
    })),
    byStatus: statRows(d.stats.by_status, totals),
    total: { count: totals.count, amount: formatMoney(totals.amount) },
    rejects: statRows(d.stats.by_reject_motif, d.stats.rejects_totals),
    rejectsTotal: { count: d.stats.rejects_totals.count, amount: formatMoney(d.stats.rejects_totals.amount) },
  }
}
export const loadDdSummary = async () => mapDdSummary(await fapiGet<FapiDdSummary>('/compta/prelevement/fapi/summary.php'))

// ---- New order: orders.php?action=candidates, action=create -------------------------------------------------------------------------------

export interface FapiDdCandidates {
  config_complete: boolean
  is_in_eec: boolean
  formats: string[]
  summary: { invoices_to_pay: number; amount_total: number; currency: string }
  invoices: Row[]
  invoices_count: number
}
export interface DdCandidateRow {
  key: string
  invoice: string
  company: string
  bankNumber: string
  umr: string
  amount: string
  date: string
}
export interface DdCandidates {
  count: number
  total: string
  currency: string
  rows: DdCandidateRow[]
}
export const mapDdCandidates = (d: FapiDdCandidates): DdCandidates => ({
  count: d.summary.invoices_to_pay,
  total: formatMoney(d.summary.amount_total),
  currency: d.summary.currency,
  rows: d.invoices.map((r, i) => ({
    key: str(r, 'invoice_id', 'id') || String(i),
    invoice: str(r, 'invoice_ref', 'ref'),
    company: str(r, 'thirdparty_name', 'company'),
    bankNumber: str(r, 'bank_number', 'iban', 'account_number'),
    umr: str(r, 'umr', 'rum'),
    amount: amt(num(r, 'invoice_total_ttc', 'amount_requested', 'amount')),
    date: mdy(str(r, 'date_request')),
  })),
})
export const loadDdCandidates = async () => mapDdCandidates(await fapiGet<FapiDdCandidates>('/compta/prelevement/fapi/orders.php', { action: 'candidates' }))

// The create is a dry run until confirm is true: it answers the plan and the totals first, and writes nothing.
export interface DdCreateResult {
  dryRun: boolean
  count: number
  total: string
  ref: string
}
interface FapiDdCreate {
  dry_run?: boolean
  summary?: { invoices_to_pay: number; amount_total: number }
  ref?: string
  invoices_included?: number
}
export async function createDdOrder(confirm: boolean): Promise<DdCreateResult> {
  const d = await fapiPost<FapiDdCreate>('/compta/prelevement/fapi/orders.php', { type: 'direct-debit', mode: 'real', format: 'ALL', confirm }, { action: 'create' })
  return {
    dryRun: d.dry_run === true,
    count: d.summary?.invoices_to_pay ?? d.invoices_included ?? 0,
    total: formatMoney(d.summary?.amount_total ?? 0),
    ref: d.ref ?? '',
  }
}
