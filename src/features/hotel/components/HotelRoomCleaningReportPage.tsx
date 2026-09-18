import { useMemo, useState } from 'react'
import { ClipboardList, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelLedger } from '../hotel.queries'

const fieldCls = 'h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const STATUS_LABEL: Record<string, string> = { assigned: 'Assigned', inprogress: 'In Progress', completed: 'Completed', inspected: 'Inspected' }
const STATUS_TAG: Record<string, string> = {
  assigned: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
  completed: 'bg-success-bg text-success-fg',
  inspected: 'bg-success-bg text-success-fg',
}

// Real page: booking/reports/room_cleaning_report.php — via custom/hotel/
// api.php?r=report&type=cleaning (a richer resource than r=cleanjobs, the
// one Room Cleaning Status uses: this one genuinely carries a Completed
// Date field, so unlike that page this report needs no "—" placeholder).
// Every filter here (Assigned Date, Completed Date, Employee Name, Room No,
// Cleaning Status) maps to a real field and filters the already-fetched
// rows live — "Go" is kept only for visual match to the real page's button.
export function HotelRoomCleaningReportPage() {
  const { data: log, isLoading, isError, error, refetch } = useHotelLedger('cleaning')

  const [assignedFrom, setAssignedFrom] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [completedFrom, setCompletedFrom] = useState('')
  const [completedTo, setCompletedTo] = useState('')
  const [employee, setEmployee] = useState('')
  const [roomNo, setRoomNo] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const employees = useMemo(() => Array.from(new Set((log ?? []).map((l) => l.hk).filter(Boolean))).sort() as string[], [log])
  const roomOptions = useMemo(() => Array.from(new Set((log ?? []).map((l) => l.room).filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, undefined, { numeric: true })) as string[], [log])

  function clearFilters() {
    setAssignedFrom('')
    setAssignedTo('')
    setCompletedFrom('')
    setCompletedTo('')
    setEmployee('')
    setRoomNo('')
    setStatus('')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = log ?? []
    if (assignedFrom) rows = rows.filter((l) => (l.assigned ?? '') >= assignedFrom)
    if (assignedTo) rows = rows.filter((l) => (l.assigned ?? '') <= assignedTo)
    if (completedFrom) rows = rows.filter((l) => (l.completed ?? '') >= completedFrom)
    if (completedTo) rows = rows.filter((l) => (l.completed ?? '') <= completedTo)
    if (employee) rows = rows.filter((l) => l.hk === employee)
    if (roomNo) rows = rows.filter((l) => l.room === roomNo)
    if (status) rows = rows.filter((l) => l.status === status)
    if (q) rows = rows.filter((l) => `${l.hk ?? ''} ${l.room ?? ''}`.toLowerCase().includes(q))
    return rows
  }, [log, assignedFrom, assignedTo, completedFrom, completedTo, employee, roomNo, status, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Employee Name', 'Room No', 'Assigned Date', 'Completed Date', 'Status'],
      rows: filtered.map((l) => [l.hk || '—', l.room || '—', l.assigned ?? '—', l.completed || '—', STATUS_LABEL[l.status ?? ''] ?? l.status ?? '—']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <ClipboardList size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Room Cleaning Report</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading cleaning log…" />}
        {isError && <LegacyErrorCard title="Couldn't load cleaning log" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">booking/reports/room_cleaning_report.php</code>.
          </p>
        </Card>

        <Card className="!h-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-text-muted mb-1">Assigned Date</label>
              <div className="flex items-center gap-1">
                <input type="date" value={assignedFrom} onChange={(e) => setAssignedFrom(e.target.value)} className={`flex-1 min-w-0 ${fieldCls}`} />
                <input type="date" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={`flex-1 min-w-0 ${fieldCls}`} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Completed Date</label>
              <div className="flex items-center gap-1">
                <input type="date" value={completedFrom} onChange={(e) => setCompletedFrom(e.target.value)} className={`flex-1 min-w-0 ${fieldCls}`} />
                <input type="date" value={completedTo} onChange={(e) => setCompletedTo(e.target.value)} className={`flex-1 min-w-0 ${fieldCls}`} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Employee Name</label>
              <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select</option>
                {employees.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Room No</label>
              <select value={roomNo} onChange={(e) => setRoomNo(e.target.value)} className={`w-full ${fieldCls}`}>
                <option value="">Select Room</option>
                {roomOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Cleaning Status</label>
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

        {log && (
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
                <TableExportButtons title="Room Cleaning Report" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No Data Available In Table</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Employee Name</th>
                      <th className="font-medium px-3 py-2">Room No</th>
                      <th className="font-medium px-3 py-2">Assigned Date</th>
                      <th className="font-medium px-3 py-2">Completed Date</th>
                      <th className="font-medium px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((l, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-text!">{l.hk || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{l.room || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{l.assigned ?? '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{l.completed || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[l.status ?? ''] ?? 'bg-neutral-bg text-neutral-fg'}`}>{STATUS_LABEL[l.status ?? ''] ?? l.status}</span>
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

      {log && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
