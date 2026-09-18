import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, LoaderCircle, Plus, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useHotelClassicBookings, useHotelCancelClassicBooking } from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const PAY_TAG: Record<string, string> = {
  paid: 'bg-success-bg text-success-fg',
  partial: 'bg-warning-bg text-warning-fg',
  unpaid: 'bg-danger-bg text-danger-fg',
}

// Real page: booking/reservation/booking_list.php?type=booking — the
// classic "Booking/Check-In List" sidebar leaf. Confirmed live this is a
// genuinely separate real backend page from the Hotel Suite SPA (custom/
// hotel/hotelindex.php): the real llx_menu row for this exact leaf points
// at this classic page, not the Suite — unlike its sibling "Room Status",
// which does redirect into the Suite. Data + actions both come straight
// from the real classic AJAX endpoints, not the Suite API — see
// hotel.queries.ts's own top comment on the classic-booking hooks for the
// full finding and live-test trail. Booking Date column is genuinely bound
// to a raw field the real page's own DataTable never actually formats as a
// date (confirmed by reading its init JS: no columnDefs/render override
// exists) — kept faithful to that real (if odd) display rather than
// silently substituting a different value under that label.
export function HotelReservations() {
  const { data: bookings, isLoading, isError, error, refetch } = useHotelClassicBookings()
  const cancel = useHotelCancelClassicBooking()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = bookings ?? []
    if (!q) return rows
    return rows.filter((b) => `${b.num} ${b.customer} ${b.status}`.toLowerCase().includes(q))
  }, [bookings, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function handleCancel(id: string, num: string) {
    const reason = prompt(`Cancel Reason for booking ${num}:`)
    if (!reason || !reason.trim()) return
    setCancelling(id)
    cancel.mutate({ bookingId: id, reason: reason.trim() }, { onSettled: () => setCancelling(null) })
  }

  function getExportData() {
    return {
      headers: ['Sl.No', 'Booking Number', 'Booking Date', 'Room Number', 'Customer Name', 'Check In', 'Check Out', 'Total Amount', 'Due Amount', 'Payment Status', 'Status'],
      rows: filtered.map((b, i) => [String(i + 1), b.num, b.bookingDateRaw, b.room || '—', b.customer || '—', b.checkIn, b.checkOut, String(b.total), String(b.due), b.paymentStatus, b.status]),
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
              <h2 className="text-lg font-bold text-text!">Booking List</h2>
              <p className="text-xs text-text-faint mt-0.5">{bookings ? `${bookings.length} shown` : ''}</p>
            </div>
          </div>
          <Link to={ROUTES.hotelNewBooking} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> ADD Booking
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading bookings…" />}
        {isError && <LegacyErrorCard title="Couldn't load bookings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">booking/reservation/booking_list.php</code>. This is the real classic table the "+ Add" button lives
            on, not the Hotel Suite SPA — Booking Date is shown exactly as the real page's own DataTable renders it (it's genuinely bound to a raw field
            that isn't the formatted date, confirmed live).
          </p>
        </Card>

        {bookings && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <h3 className="font-semibold text-text!">All bookings</h3>
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
                  placeholder="Search"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Booking List" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{bookings.length === 0 ? 'No Data Available In Table' : 'No bookings match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Sl.No</th>
                      <th className="font-medium px-3 py-2">Booking Number</th>
                      <th className="font-medium px-3 py-2">Booking Date</th>
                      <th className="font-medium px-3 py-2">Room Number</th>
                      <th className="font-medium px-3 py-2">Customer Name</th>
                      <th className="font-medium px-3 py-2">Check In</th>
                      <th className="font-medium px-3 py-2">Check Out</th>
                      <th className="font-medium px-3 py-2 text-right">Total Amount</th>
                      <th className="font-medium px-3 py-2 text-right">Due Amount</th>
                      <th className="font-medium px-3 py-2">Payment Status</th>
                      <th className="font-medium px-3 py-2">Status</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((b, i) => {
                      const payKey = b.paymentStatus.toLowerCase()
                      return (
                        <tr key={b.id || b.num} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                          <td className="px-3 py-2.5 text-brand font-medium">{b.num}</td>
                          <td className="px-3 py-2.5 text-text-muted">{b.bookingDateRaw}</td>
                          <td className="px-3 py-2.5 text-text-muted">{b.room || '—'}</td>
                          <td className="px-3 py-2.5 text-text!">{b.customer || '—'}</td>
                          <td className="px-3 py-2.5 text-text-muted">{b.checkIn}</td>
                          <td className="px-3 py-2.5 text-text-muted">{b.checkOut}</td>
                          <td className="px-3 py-2.5 text-right text-text!">K{b.total.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-text!">K{b.due.toLocaleString()}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_TAG[payKey] ?? 'bg-neutral-bg text-neutral-fg'}`}>{b.paymentStatus}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-info-bg text-info-fg">{b.status}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {b.canCancel && (
                                <button
                                  type="button"
                                  disabled={cancelling === b.id}
                                  onClick={() => handleCancel(b.id, b.num)}
                                  className="text-xs text-danger hover:underline disabled:opacity-50"
                                >
                                  {cancelling === b.id ? <LoaderCircle size={11} className="inline animate-spin" /> : 'Cancel'}
                                </button>
                              )}
                              {b.summaryUrl && (
                                <a href={b.summaryUrl} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                                  Summary
                                </a>
                              )}
                              {!b.canCancel && !b.summaryUrl && <span className="text-xs text-text-faint">—</span>}
                            </div>
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
