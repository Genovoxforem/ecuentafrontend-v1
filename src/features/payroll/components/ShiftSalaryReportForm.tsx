import { useMemo, useState } from 'react'
import { UserMinus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { MonthYearPicker, monthIsoToLabel } from '../../../shared/components/forms/MonthYearPicker'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useShiftSalaryEmployees, useShiftSalaryEntities, useShiftSalaryReport, type ShiftSalaryType } from '../payrollLists.queries'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'

const COLUMNS = ['Month', 'Employee Name', 'Designation', 'Amount/Percentage Method', 'Amount(Per Day)', 'Salaried Amount']

// Shared by Special Shift Salary Report (shift=manual) and Holiday Shift
// Salary Report (shift=holidayshift) — one real backend file, see
// shiftSalaryReportParser.ts's own top comment. The real 7th "Action" column
// links to a legacy PHP page with no React route, so it is not shown.
export function ShiftSalaryReportForm({ shift, title }: { shift: ShiftSalaryType; title: string }) {
  const [month, setMonth] = useState('')
  const [entity, setEntity] = useState('All')
  const [employee, setEmployee] = useState('All')
  const [applied, setApplied] = useState<{ month: string; entity: string; employee: string } | null>(null)
  const [error, setError] = useState('')

  const { data: entities } = useShiftSalaryEntities(shift)
  const { data: employees } = useShiftSalaryEmployees(shift)
  const { data: rows, isLoading, isError, error: fetchError, refetch } = useShiftSalaryReport(shift, applied?.month ?? '', applied?.entity ?? '', applied?.employee ?? '')

  const employeeOptions = useMemo(
    () => [{ value: 'All', label: 'All' }, ...(employees ?? []).map((o) => ({ value: o.value, label: o.group ? `${o.group} — ${o.label}` : o.label }))],
    [employees]
  )

  const table = useMemo(
    () => (rows ? { headers: COLUMNS, rows: rows.map((r) => [r.month, r.employeeName, r.designation, r.method, r.amountPerDay, r.salariedAmount]) } : null),
    [rows]
  )

  function handleGo() {
    if (!month) return setError('Select Month is required.')
    setError('')
    setApplied({ month: monthIsoToLabel(month), entity, employee })
  }

  function handleClear() {
    setMonth('')
    setEntity('All')
    setEmployee('All')
    setApplied(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <UserMinus size={20} className="text-brand" /> {title}
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Select Month" required>
            <MonthYearPicker value={month} onChange={setMonth} />
          </Field>
          <Field label="Select Entity" required>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className={inputClasses}>
              <option value="All">All Entity</option>
              {(entities ?? [])
                .filter((o) => o.value !== 'All')
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Select Employee" required>
            <SearchableSelect value={employee} onChange={setEmployee} options={employeeOptions} placeholder="All" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button type="button" onClick={handleGo} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover">
            Go
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-surface-hover">
            Clear
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading report…" />}
      {isError && <LegacyErrorCard title="Couldn't load report" message={fetchError instanceof Error ? fetchError.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {!applied && <LegacyReportTable title={title} table={{ headers: COLUMNS, rows: [] }} />}
      {table && <LegacyReportTable key={JSON.stringify(applied)} title={title} table={table} />}
    </div>
  )
}
