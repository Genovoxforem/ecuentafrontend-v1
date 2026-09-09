import { useQuery } from '@tanstack/react-query'
import { useSalesOrdersSummary, type OrderRow } from '../salesOrders/salesOrders.queries'
import { parseOrderShipmentStockDetails } from '../salesOrders/orderExtraTabsParser'

// Real reference page: expedition/shippingcard.php?action=create2's "Yet To
// Create Shipment" tab. Its own SQL (read directly from source) is:
//   SELECT ss.* FROM llx_commande ss WHERE ss.fk_statut >= '1'
//     [+ fk_user_author / fk_soc / date_creation filters matching the 3
//        visible form fields], then per matching order a second query joins
//     commandedet -> expeditiondet to skip any order that already has at
//     least one shipment line.
// Neither step has a JSON endpoint. Step 1 is reproduced honestly from the
// real, already-used commande/salesoredr_ajax_list.php (useSalesOrdersSummary)
// filtered client-side the same way. Step 2 has no JSON equivalent at all —
// confirmed live: the real order-list endpoint's `status` field never
// distinguishes "shipped" from "not shipped" (all 97 Validated orders on this
// install show status "Validated" regardless of real shipped state, checked
// directly against the live backend). The only real signal for "does this
// order still need shipping" is the same per-order Stock Details table
// Order Detail's own Shipments tab already parses (useOrderShipmentStock /
// parseOrderShipmentStockDetails against expedition/shipment.php?id=X) — so
// this re-runs that same real, already-proven check once per Validated order
// that matches the visible filters (bounded by them, same as the reference
// page's own per-row loop), rather than guessing from the order list alone.
export interface PendingShipmentFilters {
  dateFrom: string // yyyy-mm-dd, empty = no lower bound
  dateTo: string // yyyy-mm-dd, empty = no upper bound
  socid: number | null
  author: string
}

export interface PendingShipmentRow extends OrderRow {
  needsShipment: true
}

function orderDateToComparable(mmddyyyy: string): string {
  const m = mmddyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  return `${m[3]}-${m[1]}-${m[2]}`
}

function matchesFilters(order: OrderRow, filters: PendingShipmentFilters): boolean {
  if (order.status !== 'Validated') return false
  if (filters.socid && order.socid !== filters.socid) return false
  if (filters.author && order.author !== filters.author) return false
  const comparable = orderDateToComparable(order.orderDate)
  if (!comparable) return false
  if (filters.dateFrom && comparable < filters.dateFrom) return false
  if (filters.dateTo && comparable > filters.dateTo) return false
  return true
}

async function orderStillNeedsShipment(id: number): Promise<boolean> {
  const res = await fetch(`/expedition/shipment.php?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) return false
  const html = await res.text()
  return parseOrderShipmentStockDetails(html).some((row) => row.remainToShip > 0)
}

export function useOrdersPendingShipment(filters: PendingShipmentFilters) {
  const summary = useSalesOrdersSummary()
  const candidates = (summary.data?.orders ?? []).filter((o) => matchesFilters(o, filters))
  // Keyed on the candidate refs (not the filters object) so the query only
  // re-runs when the actual matching order set changes, not on every
  // keystroke in a filter field before "Search" is pressed.
  const candidateKey = candidates.map((c) => c.id).join(',')

  const check = useQuery({
    queryKey: ['salesOrders', 'pendingShipment', candidateKey],
    queryFn: async (): Promise<PendingShipmentRow[]> => {
      const results = await Promise.all(candidates.map(async (order) => ({ order, needs: await orderStillNeedsShipment(order.id) })))
      return results.filter((r) => r.needs).map((r) => ({ ...r.order, needsShipment: true as const }))
    },
    enabled: !summary.isLoading && candidates.length > 0,
    staleTime: 1000 * 30,
  })

  return {
    isLoading: summary.isLoading || (candidates.length > 0 && check.isLoading),
    isError: summary.isError || check.isError,
    error: summary.error ?? check.error,
    rows: candidates.length === 0 ? [] : (check.data ?? []),
    refetch: () => {
      summary.refetch()
      check.refetch()
    },
  }
}
