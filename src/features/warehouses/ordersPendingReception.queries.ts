import { useMemo } from 'react'
import { usePurchaseOrdersSummary, type PurchaseOrderRow } from '../purchaseOrders/purchaseOrders.queries'

// "Waiting For Reception" tab of the classic reception form: every purchase order past draft that has no reception
// yet. fourn/commande/fapi/list.php carries qty_ordered / qty_received / received_percent per order (read from the
// dispatch table), so no per-order dispatch page is fetched any more: an order is waiting while nothing has been
// received against it and it is not cancelled or refused.
export interface PendingReceptionRow extends PurchaseOrderRow {
  needsReception: true
}

// Dolibarr supplier-order statuses: 0 draft, 1 validated, 2 approved, 3 ordered, 4 partly received, 5 received,
// 6 cancelled, 7 cancelled after order, 9 refused.
const WAITING_STATUSES = new Set([1, 2, 3, 4])

export function useOrdersPendingReception() {
  const summary = usePurchaseOrdersSummary()
  const rows = useMemo<PendingReceptionRow[]>(
    () =>
      (summary.data?.orders ?? [])
        .filter((o) => WAITING_STATUSES.has(o.statusCode ?? -1) && !o.hasReceipts)
        .map((o) => ({ ...o, needsReception: true as const })),
    [summary.data],
  )
  return { isLoading: summary.isLoading, isError: summary.isError, error: summary.error, rows }
}
