import { usePurchasesSummary } from '../../features/purchases/purchases.queries'
import { PurchasesOverview } from '../../features/purchases/components/PurchasesOverview'
import { BackendUnavailableCard, BackendUnavailableSkeleton, isBackendUnavailable, isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { useAuth } from '../../features/auth/AuthContext'

export function PurchasesModule() {
  const { data: summary, isError, isLoading, error } = usePurchasesSummary()
  const { logout } = useAuth()

  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Purchases dashboard" />
  }
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The purchases dashboard" onLogout={logout} />
  }
  if (isLoading) {
    return <BackendUnavailableSkeleton feature="Purchases dashboard" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the purchases dashboard.</p>}
      {summary && <PurchasesOverview summary={summary} />}
    </>
  )
}
