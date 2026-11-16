import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchVendorSummary } from '../vendors/vendors.queries'

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
// The dashboard only shows counts, so each one is read from the `summary` block of a one-row list call (the same block
// the full lists read their totals from) instead of downloading 100 rows of every list to count them. The vendor
// count is the vendor summary's own total.
async function fetchPurchaseCounts(queryClient: QueryClient) {
  const [invoices, automatic, orders, proposals, vendors] = await Promise.allSettled([
    fapiGet<{ summary?: { count?: number } }>('/fourn/facture/fapi/list.php', { view: 'all', limit: 1 }),
    fapiGet<{ summary?: { count?: number } }>('/fourn/facture/fapi/list.php', { view: 'automatic', limit: 1 }),
    fapiGet<{ summary?: { count?: number } }>('/fourn/commande/fapi/list.php', { limit: 1 }),
    fapiGet<{ summary?: { total?: number } }>('/supplier_proposal/fapi/list.php', { limit: 1 }),
    fetchVendorSummary(queryClient),
  ])
  // The invoice list is required; the rest show 0 when their endpoint is missing.
  if (invoices.status === 'rejected') throw invoices.reason
  const count = (r: PromiseSettledResult<{ summary?: { count?: number } }>) => (r.status === 'fulfilled' ? Number(r.value.summary?.count) || 0 : 0)
  const vendorTotal = vendors.status === 'fulfilled' ? ((vendors.value as { total_vendors?: number; total?: number }).total_vendors ?? (vendors.value as { total?: number }).total) : 0
  return {
    purchaseInvoices: count(invoices),
    automaticPurchases: count(automatic),
    purchaseOrders: count(orders),
    supplierProposals: proposals.status === 'fulfilled' ? Number(proposals.value.summary?.total) || 0 : 0,
    vendors: Number(vendorTotal) || 0,
  }
}

export function usePurchasesSummary() {
  const queryClient = useQueryClient()
  const { data: counts, isLoading, isError, error } = useQuery({ queryKey: ['purchases', 'dashboard-counts'], queryFn: () => fetchPurchaseCounts(queryClient), staleTime: 1000 * 60 })

  if (isLoading) {
    return { data: undefined, isError: false, isLoading: true }
  }
  if (isError) {
    return { data: undefined, isError: true, isLoading: false, error }
  }
  if (!counts) {
    return { data: undefined, isError: true, isLoading: false, error: new Error('Purchases dashboard data unexpectedly missing.') }
  }

  const summary: PurchasesSummary = {
    stats: {
      purchaseInvoices: counts.purchaseInvoices,
      supplierProposals: counts.supplierProposals,
      purchaseOrders: counts.purchaseOrders,
      vendors: counts.vendors,
      asycudaDeclarations: 0,
      automaticPurchases: counts.automaticPurchases,
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
