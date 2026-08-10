import { useProspectsSummary } from '../../features/customers/prospects.queries'
import { ProspectsList } from '../../features/customers/components/ProspectsList'

export function ProspectsListModule() {
  const { data: summary, isError } = useProspectsSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the prospect list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ProspectsList summary={summary} />}
    </div>
  )
}
