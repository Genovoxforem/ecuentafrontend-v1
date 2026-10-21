import { usePurchaseOrdersSummary } from '../purchaseOrders/purchaseOrders.queries'
import { useSupplierProposalAreaSummary } from '../supplierProposals/supplierProposalArea.queries'
import { useVendorInvoices } from '../vendorInvoices/vendorInvoices.queries'

export interface PurchaseStatCounts {
  purchaseInvoices: number
  supplierProposals: number
  purchaseOrders: number
  vendors: number
  asycudaDeclarations: number
  automaticPurchases: number
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

export interface PurchasesSummary {
  stats: PurchaseStatCounts
  todaysPurchaseAmount: number
  todaysInvoiceCount: number
  todaysAsycudaAmount: number
  todaysAsycudaInvoiceCount: number
  invoiceStatus: InvoiceStatusRow[]
  topProducts: TopProductRow[]
  topProductsYear: number
}

// Purchase invoices are real: fourn/facture/facture_ajax_list.php (see vendorInvoices.queries.ts), including its own
// 'automatic' filter, used here for automaticPurchases. The vendor count comes from the same hook's
// societe/api/societes.php?action=stats ("suppliers") — this dashboard used to wait on the full vendor list
// (societe/fapi/list.php?type=vendor), which 404s on some backends and so kept the whole page on its loading
// placeholders. Purchase orders and supplier proposals are optional here: if their endpoints are missing the
// cards show 0 and the rest of the page still renders. There is no ASYCUDA integration and no endpoint for
// today's activity / status breakdown / top products, so those stay honest zeros/empty.
export function usePurchasesSummary() {
  const { data: purchaseOrders } = usePurchaseOrdersSummary()
  const { data: supplierProposals } = useSupplierProposalAreaSummary()
  const { data: allInvoices, isLoading: invoicesLoading, isError: invoicesIsError, error: invoicesError } = useVendorInvoices('all')
  const { data: automaticInvoices } = useVendorInvoices('automatic')

  if (invoicesLoading) {
    return { data: undefined, isError: false, isLoading: true }
  }
  if (invoicesIsError) {
    return { data: undefined, isError: true, isLoading: false, error: invoicesError }
  }
  if (!allInvoices) {
    return { data: undefined, isError: true, isLoading: false, error: new Error('Purchases dashboard data unexpectedly missing.') }
  }

  const summary: PurchasesSummary = {
    stats: {
      purchaseInvoices: allInvoices.total,
      supplierProposals: supplierProposals?.total ?? 0,
      purchaseOrders: purchaseOrders?.totalOrders ?? 0,
      vendors: allInvoices.summary.suppliers,
      asycudaDeclarations: 0,
      automaticPurchases: automaticInvoices?.total ?? 0,
    },
    todaysPurchaseAmount: 0,
    todaysInvoiceCount: 0,
    todaysAsycudaAmount: 0,
    todaysAsycudaInvoiceCount: 0,
    invoiceStatus: [
      { status: 'Draft (Needs To Be Validated)', count: 0, amount: 0 },
      { status: 'Started', count: 0, amount: 0 },
      { status: 'Paid', count: 0, amount: 0 },
      { status: 'Closed (Unpaid)', count: 0, amount: 0 },
    ],
    topProducts: [],
    topProductsYear: new Date().getFullYear(),
  }

  return { data: summary, isError: false, isLoading: false }
}
