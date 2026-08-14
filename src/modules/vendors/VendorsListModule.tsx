import { useVendorsSummary } from '../../features/vendors/vendors.queries'
import { VendorsList } from '../../features/vendors/components/VendorsList'

export function VendorsListModule() {
  const { data: summary, isError } = useVendorsSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the vendor list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <VendorsList summary={summary} />}
    </>
  )
}
