import { useUsersSummary } from '../../features/users/users.queries'
import { UsersOverview } from '../../features/users/components/UsersOverview'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function UsersDashboardModule() {
  const { data: summary, isError, error } = useUsersSummary()

  // api/users/ doesn't exist at all on the currently-active backend —
  // honest unavailable state for the 404 case, generic error message for
  // anything else.
  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Users list" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the users list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <UsersOverview summary={summary} />}
    </>
  )
}
