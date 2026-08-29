import { useVendorsSummary } from '../vendors/vendors.queries'
import { usePurchaseOrdersSummary } from '../purchaseOrders/purchaseOrders.queries'
import { useSupplierProposalsSummary } from '../supplierProposals/supplierProposals.queries'
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

// Vendors is real (societe/api/list.php?type=f — see vendors.queries.ts).
// Purchase invoices is also real: /api/purchase-invoices/ (built for this
// app against llx_facture_fourn, see vendorInvoices.queries.ts) — including
// its own real 'automatic'/'manual' status filter, used here for
// automaticPurchases. Supplier proposals and purchase orders are
// local-only (no backend endpoint exists for either — a genuine app
// limitation, not a fetch failure). This backend still has no ASYCUDA
// integration and no endpoint for today's-activity/invoice-status-
// breakdown/top-purchased-products, so those stay honest zeros/empty —
// there really is nothing to compute them from, unlike purchaseInvoices
// before this fix (see this session's PurchasesModule investigation:
// wiring in the real /api/purchase-invoices/ endpoint, and fixing this
// function's previous `!vendors` check — which treated "the vendors query
// permanently failed" the same as "still loading", so a real vendors
// fetch error hung this whole dashboard on "Loading…" forever).
export function usePurchasesSummary() {
  const { data: vendors, isLoading: vendorsLoading, isError: vendorsIsError, error: vendorsError } = useVendorsSummary()
  const { data: purchaseOrders } = usePurchaseOrdersSummary()
  const { data: supplierProposals } = useSupplierProposalsSummary()
  const { data: allInvoices, isLoading: invoicesLoading, isError: invoicesIsError, error: invoicesError } = useVendorInvoices('all')
  const { data: automaticInvoices } = useVendorInvoices('automatic')

  if (vendorsLoading || invoicesLoading) {
    return { data: undefined, isError: false, isLoading: true }
  }
  if (vendorsIsError) {
    return { data: undefined, isError: true, isLoading: false, error: vendorsError }
  }
  if (invoicesIsError) {
    return { data: undefined, isError: true, isLoading: false, error: invoicesError }
  }
  if (!vendors || !allInvoices) {
    return { data: undefined, isError: true, isLoading: false, error: new Error('Purchases dashboard data unexpectedly missing.') }
  }

  const summary: PurchasesSummary = {
    stats: {
      purchaseInvoices: allInvoices.total,
      supplierProposals: supplierProposals?.totalProposals ?? 0,
      purchaseOrders: purchaseOrders?.totalOrders ?? 0,
      vendors: vendors.totalVendors,
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
