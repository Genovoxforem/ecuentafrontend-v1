import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { fromLegacyDashboard, useLegacyHomeDashboard } from '../../features/home/home.queries'
import { useComputedHomeDashboard } from '../../features/home/homeDashboardFallback'
import { HomeOverview } from '../../features/home/components/HomeOverview'
import { useBankAccountsFirstPage, type BankAccountRow } from '../../features/banking/banking.queries'
import { NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={32} className="animate-spin text-brand" />
      <p className="text-sm text-text-faint">Loading dashboard…</p>
    </div>
  )
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { logout } = useAuth()
  if (error instanceof Error && error.message === NOT_SIGNED_IN_MESSAGE) return <LegacySessionExpiredCard feature="The dashboard" onLogout={logout} />
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <span className="w-12 h-12 rounded-full grid place-items-center bg-danger-bg text-danger-fg">
        <AlertCircle size={24} />
      </span>
      <p className="text-sm font-medium text-danger">Could not load the dashboard</p>
      <p className="text-xs text-text-faint max-w-md">{error instanceof Error ? error.message : 'Please check your connection and try again.'}</p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
        <RefreshCw size={12} /> Try again
      </button>
    </div>
  )
}

// For a user index.php shows no dashboard to: the same widgets, worked out from the invoice lists.
function ComputedDashboard({ username, accounts }: { username: string; accounts: BankAccountRow[] | undefined }) {
  const { data, isError, error } = useComputedHomeDashboard(accounts)
  if (isError) return <LoadError error={error} onRetry={() => window.location.reload()} />
  if (!data) return <Loading />
  return <HomeOverview username={username} dashboard={data} />
}

export function DashboardModule() {
  const { user } = useAuth()
  const username = user?.login || 'User'
  const legacy = useLegacyHomeDashboard()
  const accounts = useBankAccountsFirstPage()

  if (legacy.isError) return <LoadError error={legacy.error} onRetry={() => void legacy.refetch()} />
  if (legacy.isPending) return <Loading />
  if (legacy.data === null) return <ComputedDashboard username={username} accounts={accounts.data} />
  return <HomeOverview username={username} dashboard={fromLegacyDashboard(legacy.data, accounts.data)} />
}
