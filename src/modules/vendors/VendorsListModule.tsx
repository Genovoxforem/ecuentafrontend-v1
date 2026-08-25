import { useVendorsSummary } from '../../features/vendors/vendors.queries'
import { VendorsList } from '../../features/vendors/components/VendorsList'
import { BackendUnavailableCard, isBackendUnavailable } from '../../shared/components/BackendUnavailable'

export function VendorsListModule() {
  const { data: summary, isError, error } = useVendorsSummary()

  // /vendors/summary/ and /vendors/list/ don't exist on the currently-active
  // backend — honest unavailable state for the 404 case, generic error
  // message for anything else.
  if (isError && isBackendUnavailable(error)) {
    return <BackendUnavailableCard feature="Vendors list" />
  }

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the vendor list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <VendorsList summary={summary} />}
    </>
  )
}
