import { useMemo, useState } from 'react'
import { FileSpreadsheet, Info, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { MonthYearPicker, monthIsoToLabel } from '../../../shared/components/forms/MonthYearPicker'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useEmployeeMonthlyReportEmployees, useEmployeeMonthlyReport } from '../payrollLists.queries'

// Real via payroll/atten_emp_rip.php — confirmed live to be a plain
// GET-able classic report page (its own <form> is POST-only and
// CSRF-blocked cross-origin, same as earn_dedu.php's own form, but the
// same monthPic/employee_li params work fine as a GET). Genuinely real,
// live per-day data once an employee is picked — one row per calendar day
// of the chosen month, real colored Status per day, plus a real trailing
// "Total Working hours" row — see employeeMonthlyReportParser.ts.
export function EmployeeMonthlyReportForm() {
  const [monthValue, setMonthValue] = useState('')
  const [employeeValue, setEmployeeValue] = useState('')
  const [appliedMonth, setAppliedMonth] = useState('')
  const [appliedEmployee, setAppliedEmployee] = useState('')
  const [error, setError] = useState('')

  const { data: employees } = useEmployeeMonthlyReportEmployees()
  const { data: report, isLoading, isError, error: fetchError, refetch } = useEmployeeMonthlyReport(appliedMonth, appliedEmployee)

  const employeeOptions = useMemo(() => (employees ?? []).map((o) => ({ value: o.value, label: o.label })), [employees])

  function handleGo() {
    if (!monthValue) return
    if (!employeeValue) return setError('Select Employee')
    setError('')
    setAppliedMonth(monthIsoToLabel(monthValue))
    setAppliedEmployee(employeeValue)
  }

  function handleClear() {
    setMonthValue('')
    setEmployeeValue('')
    setAppliedMonth('')
    setAppliedEmployee('')
    setError('')
  }

  function getExportData() {
    return {
      headers: ['Date', 'Day', 'IN Time', 'OUT Time', 'Working Hours', 'Status', 'Details'],
      rows: (report?.rows ?? []).map((r) => [r.date, r.day, r.inTime, r.outTime, r.workingHours, r.status, r.details]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <FileSpreadsheet size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Employee Monthly Report</h2>
            <p className="text-xs text-text-faint mt-0.5">Per-day clock in/out, working hours and status for one employee's month.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-danger mb-1">Select Month *</label>
            <MonthYearPicker value={monthValue} onChange={setMonthValue} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Select Employee *</label>
            <SearchableSelect value={employeeValue} onChange={setEmployeeValue} options={employeeOptions} placeholder="Select Employee..." />
          </div>
          <button type="button" onClick={handleGo} className="h-9 flex items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
            <Search size={14} /> Go
          </button>
          <button type="button" onClick={handleClear} className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-hover">
            Clear
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {!appliedEmployee && (
          <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
            <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
            <p className="text-xs text-info-fg">
              Backend page: <code className="font-mono">payroll/atten_emp_rip.php</code>. Pick a month and an employee, then Go — this reads the real
              per-day attendance table live.
            </p>
          </Card>
        )}

        {isLoading && <LegacyLoadingCard label="Loading report…" />}
        {isError && <LegacyErrorCard title="Couldn't load report" message={fetchError instanceof Error ? fetchError.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {report && (
          <>
            <div className="text-center">
              <h3 className="text-lg font-bold text-brand">{report.employeeName} - MONTHLY REPORT</h3>
              <p className="text-sm text-text-muted">For The Month of {report.monthLabel}</p>
            </div>

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              <div className="flex flex-wrap items-center justify-end gap-3 p-3 border-b border-border">
                <TableExportButtons title="Employee Monthly Report" getExportData={getExportData} />
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-3 py-2">Date</th>
                      <th className="font-medium px-3 py-2">Day</th>
                      <th className="font-medium px-3 py-2">IN Time</th>
                      <th className="font-medium px-3 py-2">OUT Time</th>
                      <th className="font-medium px-3 py-2">Working Hours</th>
                      <th className="font-medium px-3 py-2">Status</th>
                      <th className="font-medium px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.date} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">{r.date}</td>
                        <td className="px-3 py-2 text-text-muted">{r.day}</td>
                        <td className="px-3 py-2 text-text-muted">{r.inTime}</td>
                        <td className="px-3 py-2 text-text-muted">{r.outTime}</td>
                        <td className="px-3 py-2 text-text-muted">{r.workingHours}</td>
                        <td className="px-3 py-2 font-medium" style={r.statusColor ? { color: r.statusColor } : undefined}>
                          {r.status}
                        </td>
                        <td className="px-3 py-2 text-text-muted">{r.details}</td>
                      </tr>
                    ))}
                    {report.totalWorkingHours !== null && (
                      <tr className="border-t-2 border-border font-semibold text-text!">
                        <td colSpan={4} className="px-3 py-2">
                          Total Working hours
                        </td>
                        <td className="px-3 py-2" colSpan={3}>
                          {report.totalWorkingHours}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
