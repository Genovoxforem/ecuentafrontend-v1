import { useVendorsSummary } from '../vendors/vendors.queries'
import { usePurchaseOrdersSummary } from '../purchaseOrders/purchaseOrders.queries'
import { useSupplierProposalsSummary } from '../supplierProposals/supplierProposals.queries'

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

// This backend has no purchase/supplier-invoice endpoint at all (confirmed
// reading api/ — there's no fourn/facture equivalent), and no ASYCUDA
// integration, so purchase invoices, today's activity, invoice-status
// breakdown, and top-purchased-products all stay honest zeros/empty —
// there's nothing to compute them from. Vendors is real (GET
// /api/customers/, filtered client-side on is_supplier — see
// vendors.queries.ts); supplier proposals and purchase orders are
// local-only (no backend endpoint exists for either).
export function usePurchasesSummary() {
  const { data: vendors, isLoading: vendorsLoading } = useVendorsSummary()
  const { data: purchaseOrders } = usePurchaseOrdersSummary()
  const { data: supplierProposals } = useSupplierProposalsSummary()

  if (vendorsLoading || !vendors) {
    return { data: undefined, isError: false, isLoading: true }
  }

  const summary: PurchasesSummary = {
    stats: {
      purchaseInvoices: 0,
      supplierProposals: supplierProposals?.totalProposals ?? 0,
      purchaseOrders: purchaseOrders?.totalOrders ?? 0,
      vendors: vendors.totalVendors,
      asycudaDeclarations: 0,
      automaticPurchases: 0,
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
