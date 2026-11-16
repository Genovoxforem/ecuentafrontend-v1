import { useQuery } from '@tanstack/react-query'
import { useSalesOverview } from './salesOverview.queries'
import { fetchSalesOrdersTotal } from '../salesOrders/orderCount.data'
import { fetchInvoiceListTotals, fetchInvoices } from '../../api/invoices'
import { fetchQuotations } from '../../api/quotations'
import { fetchContractStats } from '../../api/contracts'
import { fetchThirdPartySummary } from '../../api/customers'
import { fetchAllPages } from '../../api/fapiRow'

export interface SalesStatCounts {
  salesInvoices: number
  proposals: number
  salesOrders: number
  contracts: number
  customers: number
}

export interface InvoiceStatusRow {
  status: string
  count: number
  amount: number
}

export interface TopProductRow {
  product: string
  count: number
}

export interface SalesSummary {
  stats: SalesStatCounts
  todaysInvoiceAmount: number
  todaysInvoiceCount: number
  todaysRefundAmount: number
  todaysCreditNoteCount: number
  invoiceStatus: InvoiceStatusRow[]
  topProducts: TopProductRow[]
  topProductsYear: number
}

// The dashboard only shows five counts, so each one is read from the total the backend already returns instead of
// downloading the list (every invoice, every customer, every proposal and contract) just to count its rows: one-row
// pages carry pagination.total, the customer and contract summaries carry their totals. Invoices are the list plus the
// credit notes (type=all, one call), as the classic screen counts them.
export async function fetchSalesCounts() {
  const [invoices, customers, proposals, contracts, orders] = await Promise.allSettled([
    fetchInvoices({ type: 'all', page: 1, limit: 1 }),
    fetchThirdPartySummary('customer'),
    fetchQuotations({ page: 1, limit: 1 }),
    fetchContractStats({ year: new Date().getFullYear() }).catch(() => fetchContractStats()),
    fetchSalesOrdersTotal(),
  ])
  // Invoices and customers are required (the dashboard is an error without them); proposals, contracts and orders show 0 when unavailable.
  if (invoices.status === 'rejected') throw invoices.reason
  if (customers.status === 'rejected') throw customers.reason
  return {
    invoices: invoices.value.pagination.total,
    customers: customers.value.total ?? 0,
    proposals: proposals.status === 'fulfilled' ? proposals.value.pagination.total : 0,
    contracts: contracts.status === 'fulfilled' ? contracts.value.summary.total : 0,
    orders: orders.status === 'fulfilled' ? orders.value : 0,
  }
}

// "Invoice Amounts By Status": the invoice list plus the credit notes (type=all), grouped by status (0 draft, 1 started, 2 paid,
// 3 closed unpaid) with the total incl. tax of each. Checked live on newecuenta on 5 Nov 2026 against the classic Sales dashboard
// (Draft 13 / 6,051.60, Started 59 / 46,798.04, Paid 32 / 2,843.75, Closed 0, Total 104 / 55,693.39): the figures match to the cent.
// sales_overview.php's invoices_by_status (standard invoices only: 5 / 10 / 29) and GET /api/dashboard/ (counts off by one, amounts 0)
// do not, so neither is used.
// compta/facture/fapi/list.php?action=summary now carries by_status (counts) and by_status_amount (total_ttc per status): draft / unpaid (started) / paid /
// abandoned (closed unpaid); with type=all it covers the invoices and the credit notes in one call (no adding of two answers). Checked live 11 Nov 2026:
// 133 documents, draft 17 / 40,851.60, unpaid 76 / 171,730.04, paid 40 / 43,578.75.
export async function fetchInvoiceStatusBreakdownFromSummary(): Promise<InvoiceStatusRow[] | null> {
  const all = await fetchInvoiceListTotals({ type: 'all' })
  const amounts = all.by_status_amount
  if (!amounts) return null
  const round = (n: number) => Math.round(n * 100) / 100
  const row = (status: string, key: 'draft' | 'unpaid' | 'paid' | 'abandoned'): InvoiceStatusRow => ({
    status,
    count: all.by_status[key],
    amount: round(amounts[key]),
  })
  return [row('Draft (Needs To Be Validated)', 'draft'), row('Started', 'unpaid'), row('Paid', 'paid'), row('Closed (Unpaid)', 'abandoned')]
}

export async function fetchInvoiceStatusBreakdown(): Promise<InvoiceStatusRow[]> {
  // one cheap call per scope instead of downloading every invoice; the full download stays for a server without the amounts
  const fromSummary = await fetchInvoiceStatusBreakdownFromSummary().catch(() => null)
  if (fromSummary) return fromSummary
  const invoices = await fetchAllPages((page) => fetchInvoices({ page, limit: 100, type: 'all' }))
  const buckets = [0, 1, 2, 3].map(() => ({ count: 0, amount: 0 }))
  for (const i of invoices) {
    const b = buckets[i.fk_statut] ?? buckets[3]
    b.count += 1
    b.amount += Number(i.total_ttc) || 0
  }
  const round = (n: number) => Math.round(n * 100) / 100
  return [
    { status: 'Draft (Needs To Be Validated)', ...buckets[0] },
    { status: 'Started', ...buckets[1] },
    { status: 'Paid', ...buckets[2] },
    { status: 'Closed (Unpaid)', ...buckets[3] },
  ].map((r) => ({ ...r, amount: round(r.amount) }))
}

function useInvoiceStatusBreakdown() {
  return useQuery({ queryKey: ['sales', 'invoiceStatusBreakdown'], queryFn: fetchInvoiceStatusBreakdown, staleTime: 1000 * 60 })
}

function useSalesCounts() {
  return useQuery({ queryKey: ['sales', 'dashboard-counts'], queryFn: fetchSalesCounts, staleTime: 1000 * 60 })
}

export function useSalesSummary() {
  const countsQuery = useSalesCounts()
  const today = new Date().toISOString().slice(0, 10)
  const year = Number(today.slice(0, 4))
  const yearlyOverview = useSalesOverview({ year })
  const todaysOverview = useSalesOverview({ date_start: today, date_end: today })
  const breakdown = useInvoiceStatusBreakdown()

  if (countsQuery.isError) {
    return { data: undefined, isError: true, isLoading: false, error: countsQuery.error }
  }
  if (yearlyOverview.isError) {
    return { data: undefined, isError: true, isLoading: false, error: yearlyOverview.error }
  }
  if (todaysOverview.isError) {
    return { data: undefined, isError: true, isLoading: false, error: todaysOverview.error }
  }
  // No stand-in figures: the status table is the invoice list grouped, and when that cannot be read the page says so
  // instead of drawing the old /api/dashboard/ counts with 0.00 amounts.
  if (breakdown.isError) {
    return { data: undefined, isError: true, isLoading: false, error: breakdown.error }
  }

  const isLoading = countsQuery.isLoading || yearlyOverview.isLoading || todaysOverview.isLoading || breakdown.isLoading
  if (isLoading) {
    return { data: undefined, isError: false, isLoading: true }
  }
  const counts = countsQuery.data
  const annual = yearlyOverview.data
  const daily = todaysOverview.data
  if (!counts || !annual || !daily || !breakdown.data) {
    return {
      data: undefined,
      isError: true,
      isLoading: false,
      error: new Error('Sales dashboard data is missing after all required requests completed.'),
    }
  }

  const summary: SalesSummary = {
    stats: {
      salesInvoices: counts.invoices,
      proposals: counts.proposals,
      salesOrders: counts.orders,
      contracts: counts.contracts,
      customers: counts.customers,
    },
    todaysInvoiceAmount: daily.sales.total_ttc,
    todaysInvoiceCount: daily.sales.invoice_count,
    todaysRefundAmount: daily.refunds.total_ttc,
    todaysCreditNoteCount: daily.refunds.count,
    invoiceStatus: breakdown.data,
    topProducts: annual.top_products.map((product) => ({ product: product.label, count: product.qty })),
    topProductsYear: year,
  }

  return { data: summary, isError: false, isLoading: false }
}
