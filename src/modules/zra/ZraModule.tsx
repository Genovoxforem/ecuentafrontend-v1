import { useState } from 'react'
import { useZraSummary } from '../../features/zra/zra.queries'
import { ZraOverview } from '../../features/zra/components/ZraOverview'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function ZraModule() {
  const [year, setYear] = useState<number | null>(null)
  const { data: summary, isError, error } = useZraSummary(year ?? undefined)

  // api/zra/summary/ doesn't exist on the current backend (see BackendUnavailable.tsx) —
  // shown instead of the generic "Could not load" message below.
  if (isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="ZRA Synchronization Overview" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the ZRA dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ZraOverview summary={summary} year={year} onYearChange={setYear} />}
    </>
  )
}
