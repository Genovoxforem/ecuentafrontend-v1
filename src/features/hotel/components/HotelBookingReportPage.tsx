import { useMemo, useState } from 'react'
import { ChartLine, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelBookings, useHotelLedger, useHotelSettingsBundle } from '../hotel.queries'

const fieldCls = 'h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const SOURCES = ['Direct', 'Corporate', 'OTA']
const STATUS_LABEL: Record<string, string> = { confirmed: 'Confirmed', booked: 'Confirmed', checkin: 'In residence', checkout: 'Departed', cancelled: 'Cancelled', provisional: 'Provisional' }

// Real page: booking/reports/booking_report.php — no single real resource
// carries every column this page shows, so it joins two real ones by
// booking number: r=bookings (Booking Type/Source/Due amount/Status) and
// r=report&type=history (Room Number — bookings itself has no room field).
// "Booking Date" (the classic page's own filter+column) has no equivalent
// in either — same honesty rule as Check Out List/Room Cleaning Status
// elsewhere in this module — so its filter is inert and its column reads
// "—"; "Checkin/CheckOut date" is real (ci/co) and does filter. Booking
// Type options come from the real Booking Types list (settings.booking);
// Booking Source's 3 options are the Suite's own real fixed set (seen in
// its own "Rate plan / source" pickers). Filtering is applied live as
// fields change — "Go" is kept only for visual match to the real page's
// button (it re-applies nothing new), "Clear" resets every filter.
export function HotelBookingReportPage() {
  const { data: bookings, isLoading, isError, error, refetch } = useHotelBookings()
  const { data: history } = useHotelLedger('history')
  const { data: settings } = useHotelSettingsBundle()

  const [ciFrom, setCiFrom] = useState('')
  const [ciTo, setCiTo] = useState('')
  const [btype, setBtype] = useState('')
  const [src, setSrc] = useState('')
  const [customer, setCustomer] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const roomByBooking = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of history ?? []) if (h.num) map.set(h.num, h.rooms || '')
    return map
  }, [history])

  const customers = useMemo(() => Array.from(new Set((bookings ?? []).map((b) => b.guest).filter(Boolean))).sort(), [bookings])

  function clearFilters() {
    setCiFrom('')
    setCiTo('')
    setBtype('')
    setSrc('')
    setCustomer('')
    setStatus('')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = bookings ?? []
    if (ciFrom) rows = rows.filter((b) => b.ci >= ciFrom || b.co >= ciFrom)
    if (ciTo) rows = rows.filter((b) => b.ci <= ciTo || b.co <= ciTo)
    if (btype) rows = rows.filter((b) => b.btype === btype)
    if (src) rows = rows.filter((b) => b.src === src)
    if (customer) rows = rows.filter((b) => b.guest === customer)
    if (status) rows = rows.filter((b) => b.status.toLowerCase() === status)
    if (q) rows = rows.filter((b) => `${b.num} ${b.guest} ${b.btype} ${b.src} ${b.status}`.toLowerCase().includes(q))
    return rows
  }, [bookings, ciFrom, ciTo, btype, src, customer, status, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Booking Number', 'Booking Date', 'Booking Source', 'Booking Type', 'Room Number', 'Customer Name', 'Check In', 'Check Out', 'Due Amount', 'Status'],
      rows: filtered.map((b) => [b.num, '—', b.src || '—', b.btype || '—', roomByBooking.get(b.num) || '—', b.guest || '—', b.ci, b.co, String(b.bal ?? 0), STATUS_LABEL[b.status.toLowerCase()] ?? b.status]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <ChartLine size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Booking Report</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading bookings…" />}
        {isError && <LegacyErrorCard title="Couldn't load bookings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">booking/reports/booking_report.php</code>. Booking Date isn't returned by the real Hotel Suite API, so
            it's shown as "—" and its filter has no effect — Checkin/CheckOut date filters on real check-in/check-out dates instead.
          </p>
        </Card>

        <Card className="!h-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
            <div className="opacity-60" title="Not returned by the real Hotel Suite API">
              <label className="block text-xs text-text-muted mb-1">Booking Date</label>
              <input disabled placeholder="Not available" className={`w-full ${fieldCls} cursor-not-allowed`} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Checkin/CheckOut date</label>
              <div className="flex items-center gap-1">
                <input type="date" value={ciFrom} onChange={(e) => setCiFrom(e.target.value)} className={fieldCls} />
                <input type="date" value={ciTo} onChange={(e) => setCiTo(e.target.value)} className={fieldCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Booking Type</label>
              <select value={btype} onChange={(e) => setBtype(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select Booking Type</option>
                {(settings?.booking ?? []).map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Booking Source</label>
              <select value={src} onChange={(e) => setSrc(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select Booking Source</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Customer</label>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select Status</option>
                {Object.entries(STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setPage(1)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Go
            </button>
            <button type="button" onClick={clearFilters} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
              Clear
            </button>
          </div>
        </Card>

        {bookings && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
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
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Booking Report" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No Data Available In Table</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Booking Number</th>
                      <th className="font-medium px-3 py-2">Booking Date</th>
                      <th className="font-medium px-3 py-2">Booking Source</th>
                      <th className="font-medium px-3 py-2">Booking Type</th>
                      <th className="font-medium px-3 py-2">Room Number</th>
                      <th className="font-medium px-3 py-2">Customer Name</th>
                      <th className="font-medium px-3 py-2">Check In</th>
                      <th className="font-medium px-3 py-2">Check Out</th>
                      <th className="font-medium px-3 py-2 text-right">Due Amount</th>
                      <th className="font-medium px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((b) => (
                      <tr key={b.num} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-text! font-medium">{b.num}</td>
                        <td className="px-3 py-2.5 text-text-faint">—</td>
                        <td className="px-3 py-2.5 text-text-muted">{b.src || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{b.btype || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{roomByBooking.get(b.num) || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{b.guest || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{b.ci}</td>
                        <td className="px-3 py-2.5 text-text-muted">{b.co}</td>
                        <td className="px-3 py-2.5 text-right text-text!">K{Number(b.bal ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-bg text-neutral-fg">{STATUS_LABEL[b.status.toLowerCase()] ?? b.status}</span>
                        </td>
                      </tr>
                    ))}
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
