import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarPlus, LoaderCircle } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { ROUTES } from '../../../routes'
import { useHotelBookings, useHotelCancelBooking, useHotelToken } from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

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

// Real via custom/hotel/api.php?r=bookings — every reservation regardless
// of status (the classic Booking/Check-In List sidebar page reads a
// narrower slice of the same underlying data). Cancel (a=cancel) is real
// and wired; the rest of the booking lifecycle (check-in/out, move, edit
// dates) lives on Front Desk.
export function HotelReservations() {
  const { data: bookings, isLoading, isError, error, refetch } = useHotelBookings()
  const { data: token } = useHotelToken()
  const cancel = useHotelCancelBooking()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = bookings ?? []
    if (!q) return rows
    return rows.filter((b) => `${b.num} ${b.guest} ${b.btype} ${b.src} ${b.status}`.toLowerCase().includes(q))
  }, [bookings, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function handleCancel(num: string) {
    if (!token) return
    if (!confirm(`Cancel booking ${num}?`)) return
    setCancelling(num)
    cancel.mutate({ booking: num, token }, { onSettled: () => setCancelling(null) })
  }

  function getExportData() {
    return {
      headers: ['Booking', 'Guest', 'Type', 'Check-in', 'Check-out', 'Source', 'Status', 'Balance'],
      rows: filtered.map((b) => [b.num, b.guest, b.btype, b.ci, b.co, b.src, STATUS_LABEL[b.status.toLowerCase()] ?? b.status, String(b.bal)]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <CalendarCheck size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">Reservations</h2>
              <p className="text-xs text-text-faint mt-0.5">{bookings ? `${bookings.length} shown` : ''}</p>
            </div>
          </div>
          <Link to={ROUTES.hotelNewBooking} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <CalendarPlus size={14} /> New Booking
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading reservations…" />}
        {isError && <LegacyErrorCard title="Couldn't load reservations" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {bookings && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <h3 className="font-semibold text-text!">All reservations</h3>
              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by booking, guest or status…"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Reservations" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{bookings.length === 0 ? 'No reservations yet.' : 'No reservations match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Booking</th>
                      <th className="font-medium px-3 py-2">Guest</th>
                      <th className="font-medium px-3 py-2">Type</th>
                      <th className="font-medium px-3 py-2">Stay</th>
                      <th className="font-medium px-3 py-2">Source</th>
                      <th className="font-medium px-3 py-2">Status</th>
                      <th className="font-medium px-3 py-2 text-right">Balance</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((b) => {
                      const statusKey = b.status.toLowerCase()
                      const cancellable = statusKey !== 'cancelled' && statusKey !== 'checkout'
                      return (
                        <tr key={b.num} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 text-brand font-medium">{b.num}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(b.guest)]}`}>
                                {initialsFor(b.guest)}
                              </span>
                              <span className="text-text!">{b.guest || 'Guest'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-text-muted">{b.btype || '—'}</td>
                          <td className="px-3 py-2.5 text-text-muted">
                            {b.ci} → {b.co}
                          </td>
                          <td className="px-3 py-2.5 text-text-muted">{b.src || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[statusKey] ?? 'bg-neutral-bg text-neutral-fg'}`}>{STATUS_LABEL[statusKey] ?? b.status}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-text!">K{Number(b.bal).toLocaleString()}</td>
                          <td className="px-3 py-2.5">
                            {cancellable && (
                              <button
                                type="button"
                                disabled={!token || cancelling === b.num}
                                onClick={() => handleCancel(b.num)}
                                className="text-xs text-danger hover:underline disabled:opacity-50"
                              >
                                {cancelling === b.num ? <LoaderCircle size={11} className="inline animate-spin" /> : 'Cancel'}
                              </button>
                            )}
                          </td>
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

      {bookings && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
