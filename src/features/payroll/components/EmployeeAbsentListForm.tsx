import { useMemo, useState } from 'react'
import { Eraser, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAbsentListEmployees, useEmployeeAbsentList } from '../payrollLists.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real via payroll/absent_list.php — see employeeAbsentListParser.ts's own
// top comment for the real stdate/enddate format quirk (YYYY-MM-DD here,
// matching <input type="date">'s own native value with no conversion
// needed — unlike Attendance Period Report, which needs MM/DD/YYYY).
export function EmployeeAbsentListForm() {
  const [employeeValue, setEmployeeValue] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [applied, setApplied] = useState<{ employee: string; start: string; end: string } | null>(null)
  const [error, setError] = useState('')

  const { data: employees } = useAbsentListEmployees()
  const { data: report, isLoading, isError, error: fetchError, refetch } = useEmployeeAbsentList(applied?.employee ?? '', applied?.start ?? '', applied?.end ?? '')

  const employeeOptions = useMemo(() => (employees ?? []).map((o) => ({ value: o.value, label: o.group ? `${o.group} — ${o.label}` : o.label })), [employees])

  function handleSearch() {
    if (!employeeValue || !startDate || !endDate) return setError('Start Date and End Date are required.')
    setError('')
    setApplied({ employee: employeeValue, start: startDate, end: endDate })
  }

  function handleClear() {
    setEmployeeValue('All')
    setStartDate('')
    setEndDate('')
    setApplied(null)
    setError('')
  }

  function getExportData() {
    return {
      headers: ['Date', 'Day', 'Employee Name', 'Status'],
      rows: (report?.rows ?? []).map((r) => [r.date, r.day, r.employeeName, r.statusDetail ? `${r.status} (${r.statusDetail})` : r.status]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Employee</label>
            <SearchableSelect value={employeeValue} onChange={setEmployeeValue} options={employeeOptions} placeholder="All Employee..." />
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
                <TableExportButtons title="Employee Absent List" getExportData={getExportData} />
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-3 py-2">Date</th>
                      <th className="font-medium px-3 py-2">Day</th>
                      <th className="font-medium px-3 py-2">Employee Name</th>
                      <th className="font-medium px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center italic text-text-faint">
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      report.rows.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text!">{r.date}</td>
                          <td className="px-3 py-2 text-text-muted">{r.day}</td>
                          <td className="px-3 py-2 text-text-muted">{r.employeeName}</td>
                          <td className="px-3 py-2 font-medium" style={r.statusColor ? { color: r.statusColor } : undefined}>
                            {r.status}
                            {r.statusDetail && <span className="text-danger font-normal"> ({r.statusDetail})</span>}
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
    </div>
  )
}
