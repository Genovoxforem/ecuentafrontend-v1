import { useCustomersSummary } from '../../features/customers/customers.queries'
import { CustomersList } from '../../features/customers/components/CustomersList'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function CustomersListModule() {
  const { data: summary, isError, error } = useCustomersSummary()

  // /customers/summary/ and /customers/list/ don't exist on the currently-
  // active backend — show the honest unavailable state instead of a raw
  // error line for that specific case; a genuinely different failure still
  // falls through to the generic error message below.
  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Customers list" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the customer list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <CustomersList summary={summary} />}
    </>
  )
}
