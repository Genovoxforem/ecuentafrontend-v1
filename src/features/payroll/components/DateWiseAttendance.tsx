import { useMemo, useState } from 'react'
import { CalendarCheck, History, RotateCcw, Search, Users, UserCheck, UserX, Clock, CalendarDays, Loader2, X } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { useDateWiseAttendance, parseLoginHistory, type AttendanceRow } from '../payrollAttendance.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

function StatTile({ label, value, caption, icon: Icon, color }: { label: string; value: number; caption: string; icon: typeof Users; color: IconColor }) {
  return (
    <Card className="!p-4 !flex-row items-center gap-3">
      <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text! leading-tight mt-0.5">{value}</p>
        <p className="text-[11px] text-text-faint truncate mt-0.5">{caption}</p>
      </div>
    </Card>
  )
}

// Real Bootstrap modal, safely parsed rather than injected — see
// parseLoginHistory's own comment in payrollAttendance.queries.ts.
function LoginHistoryModal({ row, onClose }: { row: AttendanceRow; onClose: () => void }) {
  const history = useMemo(() => parseLoginHistory(row.loginHistoryHtml), [row])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-surface border border-border shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">{history.employeeName || row.employee}&apos;s Login History</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-2 py-2">Clock In</th>
                  <th className="font-medium px-2 py-2">Clock Out</th>
                  <th className="font-medium px-2 py-2">Clock In Note</th>
                  <th className="font-medium px-2 py-2">Clock Out Note</th>
                  <th className="font-medium px-2 py-2">Working Hour</th>
                  <th className="font-medium px-2 py-2">Devices</th>
                </tr>
              </thead>
              <tbody>
                {history.visits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-text-faint italic text-center">
                      No login history recorded.
                    </td>
                  </tr>
                ) : (
                  history.visits.map((v, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-2 py-2 text-text-muted whitespace-nowrap">{v.clockIn || '-'}</td>
                      <td className="px-2 py-2 text-text-muted whitespace-nowrap">{v.clockOut || '-'}</td>
                      <td className="px-2 py-2 text-text-muted">{v.clockInNote || '-'}</td>
                      <td className="px-2 py-2 text-text-muted">{v.clockOutNote || '-'}</td>
                      <td className="px-2 py-2 text-text-muted whitespace-nowrap">{v.workingHour || '-'}</td>
                      <td className="px-2 py-2 text-text-muted">{v.devices || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-2 py-2 text-right font-semibold text-text!">
                    Total Working Hour :
                  </td>
                  <td className="px-2 py-2 font-semibold text-text!">{history.totalWorkingHour}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="flex justify-end p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via payroll/attendance_rip_ajax.php — confirmed genuine JSON, gated
// by hasRight('payroll','award_obj','read'). Each row's "action" field on
// the real endpoint is a full HTML modal blob (a per-employee login-history
// popup) — parsed by parseLoginHistory into safe structured data instead of
// injected raw, and rendered by LoginHistoryModal above.
export function DateWiseAttendance() {
  const [date, setDate] = useState(todayIso())
  const [device, setDevice] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [historyRow, setHistoryRow] = useState<AttendanceRow | null>(null)
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
  function handleReset() {
    setDate(todayIso())
    setDevice('all')
    setSearch('')
    setPage(1)
  }

  function getExportData() {
    return {
      headers: ['#', 'Employee', 'Employee ID', 'Attendance', 'Leave Type', 'Clock In', 'Clock Out', 'Working Hours', 'Devices'],
      rows: filteredRows.map((r) => [String(r.slNo), r.employee, r.employeeId, r.attendanceLabel, r.leaveType, r.clockIn, r.clockOut, r.workingHours, r.device]),
    }
  }

  return (
    // -m-6 + flex-1 flex-col min-h-0 + sticky -top-6: same pattern as
    // AgendaOverview.tsx — keeps the title and filter row fixed in view, so
    // only the table below scrolls instead of the whole page.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 space-y-3 border-b border-border bg-white px-6 pt-6 pb-4 dark:bg-gray-950">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <CalendarCheck size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Payroll - Attendance Report</h2>
            <p className="text-xs text-text-faint mt-0.5">View and manage employee attendance, leaves and working hours.</p>
          </div>
        </div>
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
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
          </button>
          <button type="button" onClick={handleReset} className="h-9 flex items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover">
            <RotateCcw size={14} /> Reset
          </button>
          <div className="ml-auto">
            <TableExportButtons title="Attendance Report" getExportData={getExportData} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label="Loading attendance…" />}
        {isError && <LegacyErrorCard title="Couldn't load attendance" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatTile label="Total Employees" value={data.summary.employees} caption="Active staff for selected filter" icon={Users} color="blue" />
              <StatTile label="Total Present" value={data.summary.present} caption={`Marked present on ${data.summary.displayDate}`} icon={UserCheck} color="green" />
              <StatTile label="Total Absent" value={data.summary.absent} caption="Absent excluding approved leave" icon={UserX} color="rose" />
              <StatTile label="Late Login Total" value={data.summary.late} caption="Clock-in after assigned shift start" icon={Clock} color="amber" />
              <StatTile label="Total Leave" value={data.summary.leave} caption="Employees on approved leave" icon={CalendarDays} color="violet" />
            </div>

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
                <h3 className="font-semibold text-text!">Employee Attendance List</h3>
                <div className="flex items-center gap-2">
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
                  <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by employee name or ID…"
                      className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">#</th>
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
                          <td className="px-3 py-2 text-text!">
                            <div className="flex items-center gap-2">
                              <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(r.employee)]}`}>
                                {initialsFor(r.employee)}
                              </span>
                              {r.employee}
                            </div>
                          </td>
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
                            <button
                              type="button"
                              onClick={() => setHistoryRow(r)}
                              title="View login history"
                              className="w-7 h-7 rounded-md grid place-items-center bg-brand/10 text-brand hover:bg-brand/20"
                            >
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
      {historyRow && <LoginHistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />}
    </div>
  )
}
