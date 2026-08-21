import { useProspectsSummary } from '../../features/customers/prospects.queries'
import { ProspectsList } from '../../features/customers/components/ProspectsList'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function ProspectsListModule() {
  const { data: summary, isError, error } = useProspectsSummary()

  // Same permanently-missing /customers/summary/ and /customers/list/
  // endpoints as CustomersListModule — honest unavailable state for the
  // 404 case, generic error message for anything else.
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
