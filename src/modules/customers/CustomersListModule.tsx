import { useCustomersSummary } from '../../features/customers/customers.queries'
import { CustomersList } from '../../features/customers/components/CustomersList'
import { isBackendUnavailable, isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { NoDataToast } from '../../shared/components/NoDataToast'
import { useAuth } from '../../features/auth/AuthContext'

export function CustomersListModule() {
  const { data: summary, isError, error } = useCustomersSummary()
  const { logout } = useAuth()

  // societe/api/list.php's own session cookie is stale/missing (see
  // customers.queries.ts's comment) — the one real fix is signing in again.
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The customer list" onLogout={logout} />
  }

  const dataUnavailable = isError && isBackendUnavailable(error)
  const statusMessage = isError
    ? dataUnavailable
      ? 'Customer page is ready, but customer data is not available from this backend yet.'
      : 'Could not load customer data. The page is still available; please try again later.'
    : undefined

  return (
    <>
      {dataUnavailable && (
        <NoDataToast message="Customer data is not available on this backend yet." />
      )}
      <CustomersList
        summary={summary}
        isLoading={!summary && (!isError || dataUnavailable)}
        statusMessage={statusMessage}
      />
    </>
  )
}
