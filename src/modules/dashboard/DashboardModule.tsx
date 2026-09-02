import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { useDashboardSummary } from '../../features/home/home.queries'
import { HomeOverview } from '../../features/home/components/HomeOverview'

export function DashboardModule() {
  const { user } = useAuth()
  const { data: summary, isError } = useDashboardSummary()

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="w-12 h-12 rounded-full grid place-items-center bg-danger-bg text-danger-fg">
          <AlertCircle size={24} />
        </span>
        <p className="text-sm font-medium text-danger">Could not load the dashboard</p>
        <p className="text-xs text-text-faint">Please check your connection and try again.</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading dashboard…</p>
      </div>
    )
  }

  return <HomeOverview username={user?.login || 'User'} summary={summary} />
}
