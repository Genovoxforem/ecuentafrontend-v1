import { useQuery } from '@tanstack/react-query'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { num, usDate, type Numeric } from './reportFormat'

// custom/reports/monthly_customer_report_ajax.php: the pure-JSON companion of the classic Customer Report page
// (custom/reports/monthly_customer_report.php), read live on newecuenta on 10 Nov 2026. Classic SESSION cookie only: with the X-API-Key header
// alone it answers 200 with the classic login page (BUG-95).
//   ?action=getdata&thirdparty_type=customer|vendor&datefilter=MM/DD/YYYY - MM/DD/YYYY[&socid=N]
//     -> { data: [{ rowid, name, code_client, contract_count, proposal_count, proposal_amount, order_count, order_amount, invoice_count, invoice_amount,
//                   invoice_date (last invoicing), total_due, total_vat, expense_count, expense_amount, product_count, ... }] }, one row per third party
//   ?action=getdetails&type=contracts|proposals|orders|invoices|expenses|products&socid=N&datefilter=...
//     -> { data: [{ ref, date (MM/DD/YYYY), amount, sales_by, status, tax }] }
// A date range that does not parse falls back to the current month on the server.

const URL = '/custom/reports/monthly_customer_report_ajax.php'

export type ThirdPartyKind = 'customer' | 'vendor'
export type DetailKind = 'contracts' | 'proposals' | 'orders' | 'invoices' | 'expenses' | 'products'

export interface CustomerReportRow {
  rowid: number | string
  name: string
  code_client: string | null
  contract_count: number
  proposal_count: number
  proposal_amount: Numeric
  order_count: number
  order_amount: Numeric
  invoice_count: number
  invoice_amount: Numeric
  invoice_date: string | null
  total_due: Numeric
  total_vat: Numeric
  expense_count: number
  expense_amount: Numeric
  product_count: number
}

export interface CustomerDetailRow {
  ref: string
  date: string
  amount: Numeric
  sales_by: string | null
  status: string
  tax: Numeric
}

const datefilter = (start: string, end: string) => `${usDate(start)} - ${usDate(end)}`

export async function loadCustomerReport(start: string, end: string, kind: ThirdPartyKind): Promise<CustomerReportRow[]> {
  const params = new URLSearchParams({ action: 'getdata', thirdparty_type: kind, datefilter: datefilter(start, end) })
  const res = await fetch(`${URL}?${params}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`The customer report answered HTTP ${res.status}.`)
  const body = await parseLegacyJson<{ data?: CustomerReportRow[]; error?: string }>(res)
  if (body.error) throw new Error(body.error)
  return body.data ?? []
}

export async function loadCustomerDetails(socid: number | string, type: DetailKind, start: string, end: string): Promise<CustomerDetailRow[]> {
  const params = new URLSearchParams({ action: 'getdetails', type, socid: String(socid), datefilter: datefilter(start, end) })
  const res = await fetch(`${URL}?${params}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`The details answered HTTP ${res.status}.`)
  return (await parseLegacyJson<{ data?: CustomerDetailRow[] }>(res)).data ?? []
}

export function useCustomerReport(start: string, end: string, kind: ThirdPartyKind) {
  return useQuery({ queryKey: ['reports', 'monthlyCustomer', start, end, kind], queryFn: () => loadCustomerReport(start, end, kind), staleTime: 60_000, retry: false })
}

export function useCustomerDetails(socid: number | string | null, type: DetailKind, start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'monthlyCustomer', 'details', socid, type, start, end],
    queryFn: () => loadCustomerDetails(socid as number | string, type, start, end),
    enabled: socid !== null,
    staleTime: 60_000,
    retry: false,
  })
}

export interface CustomerReportTotals {
  proposalAmount: number
  proposalCount: number
  contractCount: number
  orderAmount: number
  orderCount: number
  salesAmount: number
  salesCount: number
  dueAmount: number
  vatAmount: number
  expenseAmount: number
  expenseCount: number
}

// The five summary cards of the classic page: plain sums over the rows it shows.
export function customerReportTotals(rows: CustomerReportRow[]): CustomerReportTotals {
  const t: CustomerReportTotals = { proposalAmount: 0, proposalCount: 0, contractCount: 0, orderAmount: 0, orderCount: 0, salesAmount: 0, salesCount: 0, dueAmount: 0, vatAmount: 0, expenseAmount: 0, expenseCount: 0 }
  for (const r of rows) {
    t.proposalAmount += num(r.proposal_amount)
    t.proposalCount += Math.trunc(num(r.proposal_count))
    t.contractCount += Math.trunc(num(r.contract_count))
    t.orderAmount += num(r.order_amount)
    t.orderCount += Math.trunc(num(r.order_count))
    t.salesAmount += num(r.invoice_amount)
    t.salesCount += Math.trunc(num(r.invoice_count))
    t.dueAmount += num(r.total_due)
    t.vatAmount += num(r.total_vat)
    t.expenseAmount += num(r.expense_amount)
    t.expenseCount += Math.trunc(num(r.expense_count))
  }
  return t
}
