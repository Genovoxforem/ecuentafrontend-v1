import { useSalesSummary } from '../../features/billing/billing.queries'
import { SalesOverview } from '../../features/billing/components/SalesOverview'
import { BackendUnavailableCard, BackendUnavailableSkeleton, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function SalesModule() {
  const { data: summary, isError, isLoading, error } = useSalesSummary()

  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Sales dashboard" />
  }
  if (isLoading) {
    return <BackendUnavailableSkeleton feature="Sales dashboard" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the sales dashboard.</p>}
      {summary && <SalesOverview summary={summary} />}
    </>
  )
}
