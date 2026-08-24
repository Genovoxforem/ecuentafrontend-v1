import { useProspectsSummary } from '../../features/customers/prospects.queries'
import { ProspectsList } from '../../features/customers/components/ProspectsList'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function ProspectsListModule() {
  const { data: summary, isError, error } = useProspectsSummary()

  // useProspectsSummary now calls the real societe/api/list.php (type=p),
  // same as CustomersListModule — this gate is a defensive fallback for a
  // genuine outage, not the normal path anymore.
  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Prospects list" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the prospect list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ProspectsList summary={summary} />}
    </>
  )
}
