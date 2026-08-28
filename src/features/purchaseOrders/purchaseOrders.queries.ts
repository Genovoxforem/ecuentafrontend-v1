import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { parsePurchaseOrderListRow, parseUsDate, type PurchaseOrderListRow, type RawPurchaseOrderListRow } from './purchaseOrderListParser'

export interface PurchaseOrderRow {
  id: number | null
  ref: string
  refOrderVendor: string
  requestAuthor: string
  thirdParty: string
  socid: number | null
  city: string
  zipCode: string
  orderDate: string
  plannedDelivery: string
  amountExclTax: number
  status: string
  billed: boolean
}

export interface PurchaseOrdersSummary {
  totalOrders: number
  ordersThisMonth: number
  totalPurchaseAmount: number
  approvedCount: number
  pendingCount: number
  orders: PurchaseOrderRow[]
}

function toRow(r: PurchaseOrderListRow): PurchaseOrderRow {
  return {
    id: r.id,
    ref: r.ref,
    refOrderVendor: r.refOrderVendor,
    requestAuthor: r.requestAuthor,
    thirdParty: r.thirdPartyName,
    socid: r.socid,
    city: r.city,
    zipCode: r.zipCode,
    orderDate: r.orderDate,
    plannedDelivery: r.plannedDelivery,
    amountExclTax: r.amountExclTax,
    status: r.statusLabel,
    billed: r.billed,
  }
}

// POST fourn/commande/purchase_ajax_list.php (length=-1 in the body) — a
// real, working DataTables JSON endpoint (confirmed by reading its PHP
// source directly), unrelated to the old dead /api/purchase-orders/*
// namespace this app was previously built against (which never existed on
// this backend at all — hence the local-only fake collection this
// replaces).
//
// Must be a POST, not a GET with query params: the real PHP reads
// `$_POST['length']` directly, not GETPOST() — confirmed live the same way
// as Quotations' identical bug (see quotations.queries.ts's own comment for
// the full writeup): a GET with `?length=-1` leaves $_POST empty, so
// $rowperpage silently falls back to the hardcoded default of 10 rows,
// truncating this list (and every stat card computed from it) whenever
// there are more than 10 real orders. This dataset happened to have only 7
// rows when this was first built, which is why the bug went unnoticed.
//
// The 4 stat cards on the real fourn/commande/list.php page are each their
// own raw SQL query (COUNT(*), COUNT(*) this month, SUM(total_ht), and a
// COUNT(*) GROUP BY fk_statut restricted to statuses 5 and 3) rather than
// anything this AJAX endpoint itself returns — read directly from list.php.
// Recomputed client-side here from the same full row set instead, matching
// this app's established "fetch once, compute client-side" convention.
//
// Note this reproduces a real backend quirk faithfully rather than
// "fixing" it: list.php's own Order Status card literally counts
// fk_statut===5 as "Approved" and fk_statut===3 as "Pending", even though
// LibStatut() renders status 5 as "All products received" and status 2 (not
// 5) as "Approved" in the table's own Status column — confirmed by reading
// both list.php and the LibStatut()/lang-file source. A row whose Status
// column literally says "Approved" (fk_statut===2) is NOT counted by this
// stat tile on the real page, and isn't here either.
export function usePurchaseOrdersSummary() {
  return useQuery({
    queryKey: ['purchaseOrders', 'list'],
    queryFn: async (): Promise<PurchaseOrdersSummary> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
      const { data } = await axios.post<{ aaData: RawPurchaseOrderListRow[] }>('/fourn/commande/purchase_ajax_list.php', body)
      const rows = (data.aaData ?? []).map(parsePurchaseOrderListRow)
      const now = new Date()
      const ordersThisMonth = rows.filter((r) => {
        const d = parseUsDate(r.orderDate)
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).length
      return {
        totalOrders: rows.length,
        ordersThisMonth,
        totalPurchaseAmount: rows.reduce((sum, r) => sum + r.amountExclTax, 0),
        approvedCount: rows.filter((r) => r.statusCode === 5).length,
        pendingCount: rows.filter((r) => r.statusCode === 3).length,
        orders: rows.map(toRow),
      }
    },
    staleTime: 1000 * 30,
  })
}
