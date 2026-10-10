import { useMemo, useState } from 'react'
import { Eraser, History, Search, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAttendancePeriodEmployees, useAttendancePeriodReport } from '../payrollLists.queries'
import type { AttendancePeriodHistoryVisit } from '../attendancePeriodReportParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// payroll/atten_period_rip.php to YYYY-MM-DD → MM/DD/YYYY — see
// attendancePeriodReportParser.ts's own top comment for why this page needs
// that exact format (unlike Employee Absent List, right next to it in the
// real nav, which needs YYYY-MM-DD instead).
function isoToMdy(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${m}/${d}/${y}`
}

function HistoryModal({ employee, visits, onClose }: { employee: string; visits: AttendancePeriodHistoryVisit[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-lg bg-surface border border-border shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text!">{employee}'s Login History</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          {visits.length === 0 ? (
            <p className="text-sm text-text-faint italic text-center py-4">No visits recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">In Date</th>
                  <th className="font-medium py-2 pr-3">Clock In</th>
                  <th className="font-medium py-2 pr-3">Out Date</th>
                  <th className="font-medium py-2 pr-3">Clock Out</th>
                  <th className="font-medium py-2 pr-3">Clock In Note</th>
                  <th className="font-medium py-2 pr-3">Clock Out Note</th>
                  <th className="font-medium py-2 pr-3">Working Hour</th>
                  <th className="font-medium py-2">Device</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-text!">{v.inDate}</td>
                    <td className="py-2 pr-3 text-text-muted">{v.clockIn}</td>
                    <td className="py-2 pr-3 text-text-muted">{v.outDate}</td>
                    <td className="py-2 pr-3 text-text-muted">{v.clockOut}</td>
                    <td className="py-2 pr-3 text-text-muted">{v.clockInNote}</td>
                    <td className="py-2 pr-3 text-text-muted">{v.clockOutNote}</td>
                    <td className="py-2 pr-3 text-text-muted">{v.workingHour}</td>
                    <td className="py-2 text-text-muted">{v.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// Real via payroll/atten_period_rip.php — see attendancePeriodReportParser.ts's
// own top comment. The real page's own ACTION column opens a per-row login
// history modal, server-pre-rendered inline in that same row's HTML (same
// pattern as Date Wise Attendance's own History button) — reproduced here
// from the real PHP source rather than fabricated, though this backend
// currently has zero attendance records for any employee/date (confirmed
// via payroll/attendance_rip_ajax.php), so the modal hasn't been exercised
// against a real populated row yet.
export function AttendancePeriodReportForm() {
  const [employeeValue, setEmployeeValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [applied, setApplied] = useState<{ employee: string; start: string; end: string } | null>(null)
  const [error, setError] = useState('')
  const [historyRow, setHistoryRow] = useState<{ employee: string; visits: AttendancePeriodHistoryVisit[] } | null>(null)

  const { data: employees } = useAttendancePeriodEmployees()
  const { data: report, isLoading, isError, error: fetchError, refetch } = useAttendancePeriodReport(
    applied?.employee ?? '',
    applied ? isoToMdy(applied.start) : '',
    applied ? isoToMdy(applied.end) : ''
  )

  const employeeOptions = useMemo(() => (employees ?? []).map((o) => ({ value: o.value, label: o.group ? `${o.group} — ${o.label}` : o.label })), [employees])

  function handleSearch() {
    if (!employeeValue || !startDate || !endDate) return setError('Employee, Start Date and End Date are all required.')
    setError('')
    setApplied({ employee: employeeValue, start: startDate, end: endDate })
  }

  function handleClear() {
    setEmployeeValue('')
    setStartDate('')
    setEndDate('')
    setApplied(null)
    setError('')
  }

  function getExportData() {
    return {
      headers: ['Date', 'Employee', 'Attendance', 'Type', 'In Date', 'Clock In', 'Out Date', 'Clock Out', 'Working Hours', 'IP Address'],
      rows: (report?.rows ?? []).map((r) => [r.date, r.employee, r.attendance, r.type, r.inDate, r.clockIn, r.outDate, r.clockOut, r.workingHours, r.ipAddress]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Employee</label>
            <SearchableSelect value={employeeValue} onChange={setEmployeeValue} options={employeeOptions} placeholder="Select Employee..." />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">End Date</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
          <button type="button" onClick={handleSearch} title="Search" className="h-9 w-11 grid place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
            <Search size={15} />
          </button>
          <button type="button" onClick={handleClear} title="Clear" className="h-9 w-11 grid place-items-center rounded-md border border-border text-text hover:bg-surface-hover">
            <Eraser size={15} />
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading report…" />}
        {isError && <LegacyErrorCard title="Couldn't load report" message={fetchError instanceof Error ? fetchError.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {report && (
          <>
            {(report.subhead || report.periodLabel) && (
              <div className="text-center">
                {report.subhead && <h3 className="text-lg font-bold text-brand">{report.subhead}</h3>}
                {report.periodLabel && <p className="text-sm text-text-muted">For The Period of {report.periodLabel}</p>}
              </div>
            )}

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              <div className="flex flex-wrap items-center justify-end gap-3 p-3 border-b border-border">
                <TableExportButtons title="Attendance Period Report" getExportData={getExportData} />
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-3 py-2">Date</th>
                      <th className="font-medium px-3 py-2">Employee</th>
                      <th className="font-medium px-3 py-2">Attendance</th>
                      <th className="font-medium px-3 py-2">Type</th>
                      <th className="font-medium px-3 py-2">In Date</th>
                      <th className="font-medium px-3 py-2">Clock In</th>
                      <th className="font-medium px-3 py-2">Out Date</th>
                      <th className="font-medium px-3 py-2">Clock Out</th>
                      <th className="font-medium px-3 py-2">Working Hours</th>
                      <th className="font-medium px-3 py-2">IP Address</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center italic text-text-faint">
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      report.rows.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text!">{r.date}</td>
                          <td className="px-3 py-2 text-text-muted">{r.employee}</td>
                          <td className="px-3 py-2 font-medium" style={r.attendanceColor ? { color: r.attendanceColor } : undefined}>
                            {r.attendance}
                          </td>
                          <td className="px-3 py-2 text-text-muted">{r.type}</td>
                          <td className="px-3 py-2 text-text-muted">{r.inDate}</td>
                          <td className="px-3 py-2 text-brand">{r.clockIn}</td>
                          <td className="px-3 py-2 text-text-muted">{r.outDate}</td>
                          <td className="px-3 py-2 text-brand">{r.clockOut}</td>
                          <td className="px-3 py-2 text-text-muted">{r.workingHours}</td>
                          <td className="px-3 py-2 text-text-muted">{r.ipAddress}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              title="Login History"
                              onClick={() => setHistoryRow({ employee: r.employee, visits: r.history })}
                              className="text-text-muted hover:text-brand"
                            >
                              <History size={15} />
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

      {historyRow && <HistoryModal employee={historyRow.employee} visits={historyRow.visits} onClose={() => setHistoryRow(null)} />}
    </div>
  )
}
