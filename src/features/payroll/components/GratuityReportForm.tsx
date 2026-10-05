import { useMemo, useState } from 'react'
import { UserMinus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useGratuityEmployees, useGratuityReport } from '../payrollLists.queries'

// Real via payroll/gratuity_report.php — see gratuityReportParser.ts's own
// top comment.
export function GratuityReportForm() {
  const [employeeValue, setEmployeeValue] = useState('')
  const [applied, setApplied] = useState('')
  const [error, setError] = useState('')

  const { data: employees } = useGratuityEmployees()
  const { data: report, isLoading, isError, error: fetchError, refetch } = useGratuityReport(applied)

  const employeeOptions = useMemo(() => (employees ?? []).map((o) => ({ value: o.value, label: o.group ? `${o.group} — ${o.label}` : o.label })), [employees])

  function handleGo() {
    if (!employeeValue) return setError('Select Employee')
    setError('')
    setApplied(employeeValue)
  }

  function handleClear() {
    setEmployeeValue('')
    setApplied('')
    setError('')
  }

  function getExportData() {
    return {
      headers: ['Month', 'Basic Salary', 'Gratuity Amount'],
      rows: (report?.rows ?? []).map((r) => [r.month, r.basicSalary, r.gratuityAmount]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <UserMinus size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Gratuity Report</h2>
            <p className="text-xs text-text-faint mt-0.5">Monthly gratuity accrual for one employee.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-danger mb-1">Select Employee *</label>
            <SearchableSelect value={employeeValue} onChange={setEmployeeValue} options={employeeOptions} placeholder="Select Employee..." />
          </div>
          <button type="button" onClick={handleGo} className="h-9 flex items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
            Go
          </button>
          <button type="button" onClick={handleClear} className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-hover">
            Clear
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading report…" />}
        {isError && <LegacyErrorCard title="Couldn't load report" message={fetchError instanceof Error ? fetchError.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {report && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-end gap-3 p-3 border-b border-border">
              <TableExportButtons title="Gratuity Report" getExportData={getExportData} />
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-3 py-2">Month</th>
                    <th className="font-medium px-3 py-2">Basic Salary</th>
                    <th className="font-medium px-3 py-2">Gratuity Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center italic text-text-faint">
                        No data available in table.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">{r.month}</td>
                        <td className="px-3 py-2 text-text-muted">{r.basicSalary}</td>
                        <td className="px-3 py-2 text-text-muted">{r.gratuityAmount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report.total !== null && (
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold text-text!">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2">{report.total}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
