import { useState } from 'react'
import { useZraSummary } from '../../features/zra/zra.queries'
import { ZraOverview } from '../../features/zra/components/ZraOverview'
import { isLegacySessionExpired, LegacySessionExpiredCard } from '../../shared/components/BackendUnavailable'
import { useAuth } from '../../features/auth/AuthContext'

export function ZraModule() {
  const [year, setYear] = useState<number | null>(null)
  const { data: summary, isError, error } = useZraSummary(year ?? undefined)
  const { logout } = useAuth()

  // custom/zra/zra_filter_api.php's own session cookie is stale/missing
  // (see customers.queries.ts's equivalent comment) — the one real fix is
  // signing in again.
  if (isError && isLegacySessionExpired(error)) {
    return <LegacySessionExpiredCard feature="The ZRA dashboard" onLogout={logout} />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the ZRA dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ZraOverview summary={summary} year={year} onYearChange={setYear} />}
    </>
  )
}
