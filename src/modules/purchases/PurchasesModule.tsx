import { usePurchasesSummary } from '../../features/purchases/purchases.queries'
import { PurchasesOverview } from '../../features/purchases/components/PurchasesOverview'
import { BackendUnavailableCard, isBackendUnavailable, isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { useAuth } from '../../features/auth/AuthContext'

export function PurchasesModule() {
  const { data: summary, isError, error } = usePurchasesSummary()
  const { logout } = useAuth()

  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Purchases dashboard" />
  }
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The purchases dashboard" onLogout={logout} />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the purchases dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <PurchasesOverview summary={summary} />}
    </>
  )
}
