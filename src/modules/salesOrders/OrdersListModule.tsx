import { useSalesOrdersSummary } from '../../features/salesOrders/salesOrders.queries'
import { OrdersList } from '../../features/salesOrders/components/OrdersList'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function OrdersListModule() {
  const { data: summary, isError, error } = useSalesOrdersSummary()

  // api/orders/ and api/orders/summary/ don't exist on the current backend (see
  // BackendUnavailable.tsx) — both 404, which useSalesOrdersSummary's Promise.all
  // surfaces as this query's error. Distinguished from a genuinely different
  // load failure so that one still gets the plain "could not load" message.
  if (isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Sales Orders" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the orders list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <OrdersList summary={summary} />}
    </>
  )
}
