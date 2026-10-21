import { useQuery } from '@tanstack/react-query'
import { useSalesOrdersSummary, type OrderRow } from '../salesOrders/salesOrders.queries'
import { fapiGet } from '../../api/fapiEnvelope'

// "Yet To Create Shipment" tab of the classic shipment search: validated orders (inside the date / customer / author
// filters) that still have something to ship. The candidates come from the sales order list; each one is checked
// against expedition/fapi/shipment.php (see orderStillNeedsShipment), bounded by the filters like the classic loop.
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

// expedition/fapi/shipment.php?id=: the order's lines with what is ordered, already shipped and still to ship;
// the order needs a shipment while any line has a quantity left (to_be_shipped_total > 0).
async function orderStillNeedsShipment(id: number): Promise<boolean> {
  try {
    const d = await fapiGet<{ to_be_shipped_total?: number; stock_rows?: { qty_to_ship?: number }[] }>('/expedition/fapi/shipment.php', { id })
    return (Number(d.to_be_shipped_total) || 0) > 0 || (d.stock_rows ?? []).some((r) => (Number(r.qty_to_ship) || 0) > 0)
  } catch {
    return false
  }
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
