import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { useHotelBookings } from '../hotel.queries'

const STATUS_TAG: Record<string, string> = {
  confirmed: 'bg-info-bg text-info-fg',
  booked: 'bg-info-bg text-info-fg',
  checkin: 'bg-success-bg text-success-fg',
  checkout: 'bg-neutral-bg text-neutral-fg',
  cancelled: 'bg-warning-bg text-warning-fg',
  provisional: 'bg-info-bg text-info-fg',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  booked: 'Confirmed',
  checkin: 'In residence',
  checkout: 'Departed',
  cancelled: 'Cancelled',
  provisional: 'Provisional',
}

// Real via custom/hotel/api.php?r=bookings — the Hotel Suite's own internal
// "Reservations" tab (confirmed live: a plain Booking/Guest/Type/Stay/
// Source/Status/Balance table, no filters/export/pagination on the real
// page either, so none are added here). Distinct from HotelReservations.tsx
// (the classic Booking/Check-In List page, booking/reservation/
// booking_list.php) and from HotelBookingReportPage.tsx (the classic
// Booking Report, booking/reports/booking_report.php) — this Suite sidebar
// item used to reuse Booking Report as the closest available real
// equivalent before this dedicated page existed.
export function HotelSuiteReservations() {
  const { data: bookings, isLoading, isError, error, refetch } = useHotelBookings()

  return (
    <div className="space-y-4">

      {isLoading && <LegacyLoadingCard label="Loading reservations…" />}
      {isError && <LegacyErrorCard title="Couldn't load reservations" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {bookings && (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-semibold text-text!">Reservations</h3>
            <span className="text-xs text-text-faint">{bookings.length} shown</span>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No reservations yet.</p>
          ) : (
            <div className="overflow-auto no-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2">Booking</th>
                    <th className="font-medium px-3 py-2">Guest</th>
                    <th className="font-medium px-3 py-2">Type</th>
                    <th className="font-medium px-3 py-2">Stay</th>
                    <th className="font-medium px-3 py-2">Source</th>
                    <th className="font-medium px-3 py-2">Status</th>
                    <th className="font-medium px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const statusKey = b.status.toLowerCase()
                    return (
                      <tr key={b.num} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-brand font-semibold">{b.num}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(b.guest || '?')]}`}>
                              {initialsFor(b.guest || '?')}
                            </span>
                            <span className="text-text!">{b.guest || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">{b.btype || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">
                          {b.ci} → {b.co}
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">{b.src || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[statusKey] ?? 'bg-neutral-bg text-neutral-fg'}`}>{STATUS_LABEL[statusKey] ?? b.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-text!">K{Number(b.bal).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
