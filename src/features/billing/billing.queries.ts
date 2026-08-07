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

// Combines everything already wired elsewhere: real invoice/customer
// counts and status breakdown from GET /api/dashboard/, real invoice list
// (for today's amount) from GET /api/invoices/, and local-only
// quotations/contracts counts (no backend endpoint exists for either — see
// quotations.queries.ts / contracts.queries.ts). Credit notes, ASYCUDA, and
// best-selling products have no data source at all on this backend, so
// those stay honest zeros/empty rather than invented numbers.
export function useSalesSummary() {
  const { data: stats, isLoading: statsLoading } = useDashboardStatistics()
  const { data: invoices, isLoading: invoicesLoading } = useInvoicesSummary()
  const { data: customers, isLoading: customersLoading } = useCustomersSummary()
  const { data: quotations } = useQuotationsSummary()
  const { data: contracts } = useContractsSummary()

  const isLoading = statsLoading || invoicesLoading || customersLoading
  if (isLoading || !stats || !invoices || !customers) {
    return { data: undefined, isError: false, isLoading: true }
  }

  const today = new Date().toISOString().slice(0, 10)
  const todaysRows = invoices.rows.filter((r) => r.invoiceDate.slice(0, 10) === today)
  const [draftStatus, unpaidStatus, paidStatus] = stats.chartData?.invoicesByStatus ?? []

  const summary: SalesSummary = {
    stats: {
      salesInvoices: invoices.invoices,
      proposals: quotations?.totalProposals ?? 0,
      salesOrders: stats.salesOrders?.total ?? 0,
      contracts: contracts?.totalContracts ?? 0,
      customers: customers.totalCustomers,
    },
    todaysInvoiceAmount: todaysRows.reduce((sum, r) => sum + r.amountInclTax, 0),
    todaysInvoiceCount: todaysRows.length,
    // No credit-note endpoint on this backend.
    todaysRefundAmount: 0,
    todaysCreditNoteCount: 0,
    invoiceStatus: [
      { status: 'Draft (Needs To Be Validated)', count: draftStatus?.count ?? 0, amount: draftStatus?.amount ?? 0 },
      { status: 'Started', count: unpaidStatus?.count ?? 0, amount: unpaidStatus?.amount ?? 0 },
      { status: 'Paid', count: paidStatus?.count ?? 0, amount: paidStatus?.amount ?? 0 },
      // Dolibarr's "Closed (Unpaid)" facture status isn't broken out by this
      // backend's status breakdown (only draft/unpaid/paid).
      { status: 'Closed (Unpaid)', count: 0, amount: 0 },
    ],
    // No best-selling-products endpoint on this backend.
    topProducts: [],
    topProductsYear: new Date().getFullYear(),
  }

  return { data: summary, isError: false, isLoading: false }
}
