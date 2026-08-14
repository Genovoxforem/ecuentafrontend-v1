import { useSalesSummary } from '../../features/billing/billing.queries'
import { SalesOverview } from '../../features/billing/components/SalesOverview'

export function SalesModule() {
  const { data: summary, isError } = useSalesSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the sales dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <SalesOverview summary={summary} />}
    </>
  )
}
