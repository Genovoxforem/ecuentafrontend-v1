import { useQuery } from '@tanstack/react-query'
import { useSalesOverview } from './salesOverview.queries'
import { useDashboardStatistics } from '../home/dashboardStats'
import { fetchInvoices } from '../../api/invoices'
import { fetchQuotations } from '../../api/quotations'
import { fetchContractStats } from '../../api/contracts'
import { fetchThirdPartySummary } from '../../api/customers'

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
// credit notes (type=2), as the classic screen counts them.
async function fetchSalesCounts() {
  const [invoices, creditNotes, customers, proposals, contracts] = await Promise.allSettled([
    fetchInvoices({ page: 1, limit: 1 }),
    fetchInvoices({ type: 2, page: 1, limit: 1 }),
    fetchThirdPartySummary('customer'),
    fetchQuotations({ page: 1, limit: 1 }),
    fetchContractStats({ year: new Date().getFullYear() }).catch(() => fetchContractStats()),
  ])
  // Invoices and customers are required (the dashboard is an error without them); proposals and contracts show 0 when unavailable.
  if (invoices.status === 'rejected') throw invoices.reason
  if (creditNotes.status === 'rejected') throw creditNotes.reason
  if (customers.status === 'rejected') throw customers.reason
  return {
    invoices: invoices.value.pagination.total + creditNotes.value.pagination.total,
    customers: customers.value.total ?? 0,
    proposals: proposals.status === 'fulfilled' ? proposals.value.pagination.total : 0,
    contracts: contracts.status === 'fulfilled' ? contracts.value.summary.total : 0,
  }
}

function useSalesCounts() {
  return useQuery({ queryKey: ['sales', 'dashboard-counts'], queryFn: fetchSalesCounts, staleTime: 1000 * 60 })
}

export function useSalesSummary() {
  const statsQuery = useDashboardStatistics()
  const countsQuery = useSalesCounts()
  const today = new Date().toISOString().slice(0, 10)
  const year = Number(today.slice(0, 4))
  const yearlyOverview = useSalesOverview({ year })
  const todaysOverview = useSalesOverview({ date_start: today, date_end: today })

  if (statsQuery.isError) {
    return { data: undefined, isError: true, isLoading: false, error: statsQuery.error }
  }
  if (countsQuery.isError) {
    return { data: undefined, isError: true, isLoading: false, error: countsQuery.error }
  }
  if (yearlyOverview.isError) {
    return { data: undefined, isError: true, isLoading: false, error: yearlyOverview.error }
  }
  if (todaysOverview.isError) {
    return { data: undefined, isError: true, isLoading: false, error: todaysOverview.error }
  }

  const isLoading =
    statsQuery.isLoading ||
    countsQuery.isLoading ||
    yearlyOverview.isLoading ||
    todaysOverview.isLoading
  if (isLoading) {
    return { data: undefined, isError: false, isLoading: true }
  }
  const stats = statsQuery.data
  const counts = countsQuery.data
  const annual = yearlyOverview.data
  const daily = todaysOverview.data
  if (!stats || !counts || !annual || !daily) {
    return {
      data: undefined,
      isError: true,
      isLoading: false,
      error: new Error('Sales dashboard data is missing after all required requests completed.'),
    }
  }

  const [draftStatus, unpaidStatus, paidStatus] = stats.chartData?.invoicesByStatus ?? []

  const summary: SalesSummary = {
    stats: {
      salesInvoices: counts.invoices,
      proposals: counts.proposals,
      salesOrders: stats.salesOrders?.total ?? 0,
      contracts: counts.contracts,
      customers: counts.customers,
    },
    todaysInvoiceAmount: daily.sales.total_ttc,
    todaysInvoiceCount: daily.sales.invoice_count,
    todaysRefundAmount: daily.refunds.total_ttc,
    todaysCreditNoteCount: daily.refunds.count,
    invoiceStatus: [
      { status: 'Draft (Needs To Be Validated)', count: draftStatus?.count ?? 0, amount: draftStatus?.amount ?? 0 },
      { status: 'Started', count: unpaidStatus?.count ?? 0, amount: unpaidStatus?.amount ?? 0 },
      { status: 'Paid', count: paidStatus?.count ?? 0, amount: paidStatus?.amount ?? 0 },
      // Dolibarr's "Closed (Unpaid)" facture status isn't broken out by this
      // backend's status breakdown (only draft/unpaid/paid).
      { status: 'Closed (Unpaid)', count: 0, amount: 0 },
    ],
    topProducts: annual.top_products.map((product) => ({ product: product.label, count: product.qty })),
    topProductsYear: year,
  }

  return { data: summary, isError: false, isLoading: false }
}
