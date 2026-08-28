import { useCustomersSummary } from '../../features/customers/customers.queries'
import { CustomersList } from '../../features/customers/components/CustomersList'
import { BackendUnavailableCard, isBackendUnavailable, isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { useAuth } from '../../features/auth/AuthContext'

export function CustomersListModule() {
  const { data: summary, isError, error } = useCustomersSummary()
  const { logout } = useAuth()

  // /customers/summary/ and /customers/list/ don't exist on the currently-
  // active backend — show the honest unavailable state instead of a raw
  // error line for that specific case; a genuinely different failure still
  // falls through to the generic error message below.
  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Customers list" />
  }
  // societe/api/list.php's own session cookie is stale/missing (see
  // customers.queries.ts's comment) — the one real fix is signing in again.
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The customer list" onLogout={logout} />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the customer list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <CustomersList summary={summary} />}
    </>
  )
}
