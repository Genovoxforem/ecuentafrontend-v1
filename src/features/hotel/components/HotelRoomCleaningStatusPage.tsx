import { useMemo, useState } from 'react'
import { Sparkles, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelCleanJobs } from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assigned',
  inprogress: 'In Progress',
  completed: 'Completed',
  inspected: 'Inspected',
}
const STATUS_TAG: Record<string, string> = {
  assigned: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
  completed: 'bg-success-bg text-success-fg',
  inspected: 'bg-success-bg text-success-fg',
}

// Real page: booking/service/room_cleaning.php (mainmenu=hotel&leftmenu=
// room_clean_obj) — via custom/hotel/api.php?r=cleanjobs (real Suite
// resource, same one HotelHousekeeping.tsx's own assignments table already
// uses). Sl.No/Employee Name/Room No/Status are all real fields (hk/room/
// status). Completed Date has no equivalent field on this resource at all
// (only an "assigned" date is ever returned, regardless of status), so —
// same honesty rule as Booking Date elsewhere in this module — it's shown
// as "—" rather than reusing the assigned date under a different label.
// Read-only, matching the real classic page (no Action column there).
export function HotelRoomCleaningStatusPage() {
  const { data: jobs, isLoading, isError, error, refetch } = useHotelCleanJobs()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = jobs ?? []
    if (!q) return rows
    return rows.filter((j) => `${j.hk} ${j.room} ${j.status}`.toLowerCase().includes(q))
  }, [jobs, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Sl.No', 'Employee Name', 'Room No', 'Assigned Date', 'Completed Date', 'Status'],
      rows: filtered.map((j, i) => [String(i + 1), j.hk || '—', j.room || '—', j.assigned, '—', STATUS_LABEL[j.status] ?? j.status]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Sparkles size={18} className="text-brand" /> Room Cleaning
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading cleaning jobs…" />}
        {isError && <LegacyErrorCard title="Couldn't load cleaning jobs" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">booking/service/room_cleaning.php</code>. Completed Date has no equivalent field in the real Hotel
            Suite API, so it's shown as "—".
          </p>
        </Card>

        {jobs && (
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
                <TableExportButtons title="Room Cleaning" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{jobs.length === 0 ? 'No Data Available In Table' : 'No cleaning jobs match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Sl.No</th>
                      <th className="font-medium px-3 py-2">Employee Name</th>
                      <th className="font-medium px-3 py-2">Room No</th>
                      <th className="font-medium px-3 py-2">Assigned Date</th>
                      <th className="font-medium px-3 py-2">Completed Date</th>
                      <th className="font-medium px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((j, i) => (
                      <tr key={j.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                        <td className="px-3 py-2.5 text-text!">{j.hk || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{j.room || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{j.assigned}</td>
                        <td className="px-3 py-2.5 text-text-faint">—</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[j.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{STATUS_LABEL[j.status] ?? j.status}</span>
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

      {jobs && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
