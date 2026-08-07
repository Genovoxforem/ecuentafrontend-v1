import { useAuth } from '../../features/auth/AuthContext'
import { useDashboardSummary } from '../../features/home/home.queries'
import { HomeOverview } from '../../features/home/components/HomeOverview'

export function DashboardModule() {
  const { user } = useAuth()
  const { data: summary, isError } = useDashboardSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <HomeOverview username={user?.login || 'User'} summary={summary} />}
    </div>
  )
}
