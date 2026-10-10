import { useMemo, useState } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useEmployerContribution, usePayrollReportEmployees } from '../payrollStatutoryReports.queries'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'

const COLUMNS = ['Month', 'Currency', 'Gross Salary', 'Basic Salary', 'Account Type', 'Amount']

// Real via payroll/employer_contribution.php — Year + active Employee, then
// one row per paid monthly payslip of that year whose salary template carries
// employer contribution accounts (Account Type / Amount hold one line each).
// Sent as a GET: the page's own <form> POST is CSRF-blocked, but the PHP reads
// $_REQUEST.
export function EmployerContributionForm() {
  const [year, setYear] = useState('')
  const [employee, setEmployee] = useState('')
  const [applied, setApplied] = useState<{ year: string; employee: string } | null>(null)
  const [error, setError] = useState('')

  const { data: employees } = usePayrollReportEmployees('/payroll/employer_contribution.php')
  const { data: table, isLoading, isError, error: fetchError, refetch } = useEmployerContribution(applied)

  const employeeOptions = useMemo(() => (employees ?? []).map((o) => ({ value: o.value, label: o.group ? `${o.group} — ${o.label}` : o.label })), [employees])

  function handleGo() {
    if (!/^\d{4}$/.test(year) || !employee) return setError('Select Year and Select Employee are required.')
    setError('')
    setApplied({ year, employee })
  }

  function handleClear() {
    setYear('')
    setEmployee('')
    setApplied(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto !flex-row flex-wrap items-end gap-4">
        <div className="flex flex-1 flex-wrap items-end gap-4 [&>*]:min-w-44 [&>*]:flex-1">
          <Field label="Select Year" required>
            <input type="number" min={1900} max={2200} placeholder="YYYY" value={year} onChange={(e) => setYear(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Select Employee" required>
            <SearchableSelect value={employee} onChange={setEmployee} options={employeeOptions} placeholder="Select Employee..." />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      {!applied && <LegacyReportTable title="Employer Contribution" table={{ headers: COLUMNS, rows: [] }} />}
      {table && <LegacyReportTable key={`${applied?.year}-${applied?.employee}`} title="Employer Contribution" table={table} />}
    </div>
  )
}
