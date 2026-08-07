import { useSalesOrdersSummary } from '../../features/salesOrders/salesOrders.queries'
import { OrdersList } from '../../features/salesOrders/components/OrdersList'

export function OrdersListModule() {
  const { data: summary, isError } = useSalesOrdersSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the orders list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <OrdersList summary={summary} />}
    </div>
  )
}
