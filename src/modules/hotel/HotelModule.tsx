import { useHotelSummary } from '../../features/hotel/hotel.queries'
import { HotelOverview } from '../../features/hotel/components/HotelOverview'

export function HotelModule() {
  const { data: summary, isError } = useHotelSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the booking dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <HotelOverview summary={summary} />}
    </>
  )
}
