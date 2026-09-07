import { useMemo, useState } from 'react'
import { CalendarCheck, History, RefreshCw, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useDateWiseAttendance, type AttendanceRow } from '../payrollAttendance.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Real via payroll/attendance_rip_ajax.php — confirmed genuine JSON, gated
// by hasRight('payroll','award_obj','read'). Each row's "action" field on
// the real endpoint is a full HTML modal blob (a per-employee login-history
// popup wired to Bootstrap's data-bs-toggle) — not rendered here since
// injecting raw backend HTML isn't safe practice; the History icon below is
// a placeholder for that real feature rather than a rebuilt modal.
export function DateWiseAttendance() {
  const [date, setDate] = useState(todayIso())
  const [device, setDevice] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const { data, isLoading, isError, error, refetch, isFetching } = useDateWiseAttendance(date)

  // Real, but narrow: only devices that show up in the currently-loaded
  // rows, not every device ever registered (no JSON endpoint lists those —
  // see this file's own header comment). Rows with no recorded attendance
  // come back with device as either an empty string or a literal "-"
  // placeholder (same convention as attendanceLabel's own '-' fallback
  // below) — both excluded here, or the filter offers a bogus "-" option.
  const devices = useMemo(
    () => Array.from(new Set((data?.rows ?? []).map((r) => r.device).filter((d) => Boolean(d) && d !== '-'))),
    [data],
  )

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? []
    const q = search.trim().toLowerCase()
    return rows.filter((r: AttendanceRow) => {
      if (device !== 'all' && r.device !== device) return false
      if (!q) return true
      return `${r.employee} ${r.employeeId}`.toLowerCase().includes(q)
    })
  }, [data, device, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  function handleDateChange(value: string) {
    setDate(value)
    setPage(1)
  }
  function handleDeviceChange(value: string) {
    setDevice(value)
    setPage(1)
  }
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6 + flex-1 flex-col min-h-0 + sticky -top-6: same pattern as
    // AgendaOverview.tsx — keeps the title and filter row fixed in view, so
    // only the table below scrolls instead of the whole page.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 space-y-3 border-b border-border bg-white px-6 pt-6 pb-4 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CalendarCheck size={20} className="text-brand" /> Payroll - Attendance Report
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-text-muted mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Devices</label>
            <select value={device} onChange={(e) => handleDeviceChange(e.target.value)} className={inputCls}>
              <option value="all">All Devices</option>
              {devices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 flex items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label="Loading attendance…" />}
        {isError && <LegacyErrorCard title="Couldn't load attendance" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <>
            <p className="text-sm font-semibold text-text!">
              Attendance On: <span className="text-brand">{data.summary.displayDate}</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(
                [
                  { label: 'Total Employees', value: data.summary.employees },
                  { label: 'Total Present', value: data.summary.present },
                  { label: 'Total Absent', value: data.summary.absent },
                  { label: 'Late Login Total', value: data.summary.late },
                  { label: 'Total Leave', value: data.summary.leave },
                ] as const
              ).map((s) => (
                <Card key={s.label} className="!h-auto text-center">
                  <p className="text-xl font-bold text-text!">{s.value}</p>
                  <p className="text-xs text-text-faint uppercase tracking-wide">{s.label}</p>
                </Card>
              ))}
            </div>

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
                <select
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="relative w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search"
                    className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">SI.No</th>
                      <th className="font-medium px-3 py-2">Employee</th>
                      <th className="font-medium px-3 py-2">Employee ID</th>
                      <th className="font-medium px-3 py-2">Attendance</th>
                      <th className="font-medium px-3 py-2">Leave Type</th>
                      <th className="font-medium px-3 py-2">Clock In</th>
                      <th className="font-medium px-3 py-2">Clock Out</th>
                      <th className="font-medium px-3 py-2">Working Hours</th>
                      <th className="font-medium px-3 py-2">Devices</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-4 text-text-faint italic">
                          {data.rows.length === 0 ? 'No active employees found.' : 'No rows match your search or filter.'}
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r) => (
                        <tr key={r.employeeId + r.slNo} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text-muted">{r.slNo}</td>
                          <td className="px-3 py-2 text-text!">{r.employee}</td>
                          <td className="px-3 py-2 text-text-muted">{r.employeeId}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.isPresent ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>
                              {r.attendanceLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-text-muted">{r.leaveType}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.clockIn}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.clockOut}</td>
                          <td className="px-3 py-2 text-text-muted">{r.workingHours}</td>
                          <td className="px-3 py-2 text-text-muted">{r.device}</td>
                          <td className="px-3 py-2">
                            <button type="button" disabled title="Real login-history modal exists on the legacy endpoint but isn't rebuilt here" className="text-text-faint cursor-default">
                              <History size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
      {data && <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
