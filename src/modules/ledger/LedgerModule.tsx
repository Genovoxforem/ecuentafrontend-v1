import { useLedgerSummary } from '../../features/generalLedger/generalLedger.queries'
import { LedgerOverview } from '../../features/generalLedger/components/LedgerOverview'

export function LedgerModule() {
  const { data: summary, isError } = useLedgerSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the ledger.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <LedgerOverview summary={summary} />}
    </div>
  )
}
