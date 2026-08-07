import { usePurchaseOrdersSummary } from '../../features/purchaseOrders/purchaseOrders.queries'
import { PurchaseOrdersList } from '../../features/purchaseOrders/components/PurchaseOrdersList'

export function PurchaseOrdersListModule() {
  const { data: summary, isError } = usePurchaseOrdersSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the purchase orders list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <PurchaseOrdersList summary={summary} />}
    </div>
  )
}
