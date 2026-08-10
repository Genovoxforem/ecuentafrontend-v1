import { usePurchasesSummary } from '../../features/purchases/purchases.queries'
import { PurchasesOverview } from '../../features/purchases/components/PurchasesOverview'

export function PurchasesModule() {
  const { data: summary, isError } = usePurchasesSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the purchases dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <PurchasesOverview summary={summary} />}
    </>
  )
}
