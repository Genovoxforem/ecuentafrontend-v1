import { useProspectsSummary } from '../../features/customers/prospects.queries'
import { ProspectsList } from '../../features/customers/components/ProspectsList'
import { isBackendUnavailable } from '../../shared/components/BackendUnavailable'
import { NoDataToast } from '../../shared/components/NoDataToast'

export function ProspectsListModule() {
  const { data: summary, isError, isLoading, error } = useProspectsSummary()

  const dataUnavailable = isError && isBackendUnavailable(error)
  const statusMessage = isError
    ? dataUnavailable
      ? 'Prospect page is ready, but prospect data is not available from this backend yet.'
      : 'Could not load prospect data. The page is still available; please try again later.'
    : undefined

  return (
    <>
      {dataUnavailable && <NoDataToast message="Prospect data is not available on this backend yet." />}
      <ProspectsList
        summary={summary}
        isLoading={!summary && (isLoading || dataUnavailable)}
        statusMessage={statusMessage}
      />
    </>
  )
}
