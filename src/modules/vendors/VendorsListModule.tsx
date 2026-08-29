import { useVendorsSummary } from '../../features/vendors/vendors.queries'
import { VendorsList } from '../../features/vendors/components/VendorsList'
import { BackendUnavailableCard, isBackendUnavailable, isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { useAuth } from '../../features/auth/AuthContext'

export function VendorsListModule() {
  const { data: summary, isError, error } = useVendorsSummary()
  const { logout } = useAuth()

  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Vendors list" />
  }
  // societe/api/list.php's own session cookie is stale/missing (see
  // customers.queries.ts's equivalent comment) — the one real fix is
  // signing in again.
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The vendor list" onLogout={logout} />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the vendor list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <VendorsList summary={summary} />}
    </>
  )
}
