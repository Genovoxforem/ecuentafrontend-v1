import { useCustomersSummary } from '../../features/customers/customers.queries'
import { LoanCustomersList } from '../../features/loans/components/LoanCustomersList'
import { BackendUnavailableCard, isBackendUnavailable, isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { useAuth } from '../../features/auth/AuthContext'

export function LoanCustomerListModule() {
  const { data: summary, isError, error } = useCustomersSummary()
  const { logout } = useAuth()

  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Loan customer list" />
  }
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The loan customer list" onLogout={logout} />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the loan customer list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <LoanCustomersList summary={summary} />}
    </>
  )
}
