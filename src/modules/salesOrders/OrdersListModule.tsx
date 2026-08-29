import { useSalesOrdersSummary } from '../../features/salesOrders/salesOrders.queries'
import { OrdersList } from '../../features/salesOrders/components/OrdersList'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function OrdersListModule() {
  const { data: summary, isError, error } = useSalesOrdersSummary()

  // useSalesOrdersSummary now reads the real commande/salesoredr_ajax_list.php
  // endpoint (see salesOrders.queries.ts) instead of the dead api/orders/ routes,
  // so this shouldn't fire in normal operation — kept as a fallback in case the
  // legacy backend itself is ever unreachable, distinguished from a genuinely
  // different load failure so that one still gets the plain "could not load" message.
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
