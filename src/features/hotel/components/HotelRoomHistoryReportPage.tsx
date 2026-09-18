import { useMemo, useState } from 'react'
import { History, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelLedger, useHotelRoomsAdmin } from '../hotel.queries'

const fieldCls = 'h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Real page: booking/reports/room_history.php — via custom/hotel/api.php?
// r=report&type=history (the same real ledger Reports' own "Room history"
// tab already reads). The real classic page requires picking a room before
// it shows anything (its own header stays greyed out until then); this
// mirrors that by filtering the already-fetched real rows client-side
// rather than re-querying, and by holding the table back until a room is
// picked. Room options come from the real Rooms list (r=rooms_admin — same
// source Room List uses). "Room Rate (Per Day)" has no equivalent field in
// this ledger resource at all, so it's shown as "—".
export function HotelRoomHistoryReportPage() {
  const { data: history, isLoading, isError, error, refetch } = useHotelLedger('history')
  const { data: rooms } = useHotelRoomsAdmin()

  const [room, setRoom] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const roomOptions = useMemo(() => Array.from(new Set((rooms ?? []).map((r) => r.no))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [rooms])

  const filtered = useMemo(() => {
    if (!room) return []
    const q = search.trim().toLowerCase()
    let rows = (history ?? []).filter((h) => (h.rooms || '').split(',').map((s) => s.trim()).includes(room))
    if (from) rows = rows.filter((h) => (h.ci ?? '') >= from || (h.co ?? '') >= from)
    if (to) rows = rows.filter((h) => (h.ci ?? '') <= to || (h.co ?? '') <= to)
    if (q) rows = rows.filter((h) => `${h.num ?? ''} ${h.guest ?? ''}`.toLowerCase().includes(q))
    return rows
  }, [history, room, from, to, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Sl.No', 'Room Number', 'Customer Name', 'Check-In Date', 'Check-Out Date', 'Room Rate (Per Day)'],
      rows: filtered.map((h, i) => [String(i + 1), room, h.guest || '—', h.ci ?? '', h.co ?? '', '—']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <History size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Room History Report</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading room history…" />}
        {isError && <LegacyErrorCard title="Couldn't load room history" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">booking/reports/room_history.php</code>. Room Rate (Per Day) has no equivalent field in the real Hotel
            Suite API for this report, so it's shown as "—".
          </p>
        </Card>

        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs text-danger mb-1">Search Room Number *</label>
              <select value={room} onChange={(e) => setRoom(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select Room</option>
                {roomOptions.map((no) => (
                  <option key={no} value={no}>
                    {no}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Date</label>
              <div className="flex items-center gap-1">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldCls} />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldCls} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setPage(1)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Go
            </button>
            <button
              type="button"
              onClick={() => {
                setRoom('')
                setFrom('')
                setTo('')
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
            >
              Clear
            </button>
          </div>
        </Card>

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
              <TableExportButtons title="Room History Report" getExportData={getExportData} />
            </div>
          </div>

          {!room ? (
            <p className="text-sm text-text-faint italic py-6 text-center">Select a room number to view its history.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No Data Available In Table</p>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2">Sl.No</th>
                    <th className="font-medium px-3 py-2">Room Number</th>
                    <th className="font-medium px-3 py-2">Customer Name</th>
                    <th className="font-medium px-3 py-2">Check-In Date</th>
                    <th className="font-medium px-3 py-2">Check-Out Date</th>
                    <th className="font-medium px-3 py-2 text-right">Room Rate (Per Day)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((h, i) => (
                    <tr key={h.num ?? i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-3 py-2.5 text-text! font-medium">{room}</td>
                      <td className="px-3 py-2.5 text-text-muted">{h.guest || '—'}</td>
                      <td className="px-3 py-2.5 text-text-muted">{h.ci ?? '—'}</td>
                      <td className="px-3 py-2.5 text-text-muted">{h.co ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-text-faint">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {room && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
