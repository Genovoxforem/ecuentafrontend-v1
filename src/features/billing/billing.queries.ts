import { useSalesOverview } from './salesOverview.queries'
import { useDashboardStatistics } from '../home/dashboardStats'
import { useInvoicesSummary } from '../invoices/invoices.queries'
import { useCustomersSummary } from '../customers/customers.queries'
import { useQuotationsSummary } from '../quotations/quotations.queries'
import { useContractsSummary } from '../contracts/contracts.queries'

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

export function useSalesSummary() {
  const statsQuery = useDashboardStatistics()
  const invoicesQuery = useInvoicesSummary()
  const customersQuery = useCustomersSummary()
  const { data: quotations } = useQuotationsSummary()
  const { data: contracts } = useContractsSummary()
  const today = new Date().toISOString().slice(0, 10)
  const year = Number(today.slice(0, 4))
  const yearlyOverview = useSalesOverview({ year })
  const todaysOverview = useSalesOverview({ date_start: today, date_end: today })

  if (statsQuery.isError) {
    return { data: undefined, isError: true, isLoading: false, error: statsQuery.error }
  }
  if (invoicesQuery.isError) {
    return { data: undefined, isError: true, isLoading: false, error: invoicesQuery.error }
  }
  if (customersQuery.isError) {
    return { data: undefined, isError: true, isLoading: false, error: customersQuery.error }
  }
  if (yearlyOverview.isError) {
    return { data: undefined, isError: true, isLoading: false, error: yearlyOverview.error }
  }
  if (todaysOverview.isError) {
    return { data: undefined, isError: true, isLoading: false, error: todaysOverview.error }
  }

  const isLoading =
    statsQuery.isLoading ||
    invoicesQuery.isLoading ||
    customersQuery.isLoading ||
    yearlyOverview.isLoading ||
    todaysOverview.isLoading
  if (isLoading) {
    return { data: undefined, isError: false, isLoading: true }
  }
  const stats = statsQuery.data
  const invoices = invoicesQuery.data
  const customers = customersQuery.data
  const annual = yearlyOverview.data
  const daily = todaysOverview.data
  if (!stats || !invoices || !customers || !annual || !daily) {
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
      salesInvoices: invoices.invoices,
      proposals: quotations?.totalProposals ?? 0,
      salesOrders: stats.salesOrders?.total ?? 0,
      contracts: contracts?.totalContracts ?? 0,
      customers: customers.totalCustomers,
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
