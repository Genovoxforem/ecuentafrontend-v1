import { useKitchenSummary } from '../../features/kitchen/kitchen.queries'
import { KitchenOverview } from '../../features/kitchen/components/KitchenOverview'

export function KitchenModule() {
  const { data: summary, isError } = useKitchenSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the kitchen dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <KitchenOverview summary={summary} />}
    </>
  )
}
