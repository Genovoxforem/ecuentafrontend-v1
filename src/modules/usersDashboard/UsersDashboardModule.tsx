import { useUsersSummary } from '../../features/users/users.queries'
import { UsersOverview } from '../../features/users/components/UsersOverview'

export function UsersDashboardModule() {
  const { data: summary, isError } = useUsersSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the users list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <UsersOverview summary={summary} />}
    </>
  )
}
