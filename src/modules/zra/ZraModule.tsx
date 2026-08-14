import { useState } from 'react'
import { useZraSummary } from '../../features/zra/zra.queries'
import { ZraOverview } from '../../features/zra/components/ZraOverview'

export function ZraModule() {
  const [year, setYear] = useState<number | null>(null)
  const { data: summary, isError } = useZraSummary(year ?? undefined)

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the ZRA dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ZraOverview summary={summary} year={year} onYearChange={setYear} />}
    </>
  )
}
