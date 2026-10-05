import { useMemo, useState, type ComponentType } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { MonthYearPicker, monthIsoToLabel } from '../../../shared/components/forms/MonthYearPicker'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useDeductionHeads,
  usePayrollReportEmployees,
  useSearchTypeReport,
  type SearchTypeReportFilters,
  type SearchTypeReportPath,
} from '../payrollStatutoryReports.queries'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'

type SearchType = '' | 'emp' | 'month' | 'year'

// Shared by Allowance/Deduction Report (payroll_deduction.php), NAPSA Report
// (napsa_report.php) and NHIMA Report (nhima_report.php) — one real template:
// Search Type (By Employee / By Month / By Year) revealing the matching second
// filter, plus (Allowance/Deduction only) an Allowance/Deduction Head. Each
// page's own <form> POST is CSRF-blocked in the browser, but the PHP reads
// $_REQUEST, so the same fields are sent as a GET — see
// payrollStatutoryReports.queries.ts.
export function SearchTypeReportForm({
  path,
  title,
  icon: Icon,
  withHead = false,
}: {
  path: SearchTypeReportPath
  title: string
  icon: ComponentType<{ size?: number; className?: string }>
  withHead?: boolean
}) {
  const [searchType, setSearchType] = useState<SearchType>('')
  const [head, setHead] = useState('')
  const [employee, setEmployee] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [applied, setApplied] = useState<SearchTypeReportFilters | null>(null)
  const [error, setError] = useState('')

  const { data: employees } = usePayrollReportEmployees(path)
  const { data: heads } = useDeductionHeads()
  const { data: table, isLoading, isError, error: fetchError, refetch } = useSearchTypeReport(path, applied)

  const employeeOptions = useMemo(() => (employees ?? []).map((o) => ({ value: o.value, label: o.group ? `${o.group} — ${o.label}` : o.label })), [employees])

  function handleGo() {
    if (!searchType) return setError('Type Required !')
    if (withHead && !head) return setError('Select Deduction Head !')
    if (searchType === 'emp' && !employee) return setError('Select Employee !')
    if (searchType === 'month' && !month) return setError('Select Month !')
    if (searchType === 'year' && !/^\d{4}$/.test(year)) return setError('Select Year !')
    setError('')
    setApplied({ searchType, employee, monthLabel: month ? monthIsoToLabel(month) : '', year, expenseType: withHead ? head : undefined })
  }

  function handleClear() {
    setSearchType('')
    setHead('')
    setEmployee('')
    setMonth('')
    setYear('')
    setApplied(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Search Type" required>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value as SearchType)} className={inputClasses}>
              <option value="">Select Search Type</option>
              <option value="emp">By Employee</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>
          </Field>
          {withHead && searchType && (
            <Field label="Allowance/Deduction Head" required>
              <select value={head} onChange={(e) => setHead(e.target.value)} className={inputClasses}>
                <option value="">Select Deduction Head</option>
                {(heads ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {searchType === 'emp' && (
            <Field label="Employee Name" required>
              <SearchableSelect value={employee} onChange={setEmployee} options={employeeOptions} placeholder="Select Employee..." />
            </Field>
          )}
          {searchType === 'month' && (
            <Field label="Select Month" required>
              <MonthYearPicker value={month} onChange={setMonth} />
            </Field>
          )}
          {searchType === 'year' && (
            <Field label="Select Year" required>
              <input type="number" min={1900} max={2200} placeholder="YYYY" value={year} onChange={(e) => setYear(e.target.value)} className={inputClasses} />
            </Field>
          )}
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
      {!applied && <LegacyReportTable title={title} table={{ headers: columnsFor(path), rows: [] }} />}
      {table && <LegacyReportTable key={JSON.stringify(applied)} title={title} table={table} />}
    </div>
  )
}

// Column headings shown before the first search, matching what the real
// page's <thead> prints (the rows only arrive once Go is pressed).
function columnsFor(path: SearchTypeReportPath): string[] {
  switch (path) {
    case '/payroll/payroll_deduction.php':
      return ['Sl.No', 'Employee Name', 'Month', 'Allowance/Deduction Head', 'Amount']
    case '/payroll/napsa_report.php':
      return ['Sl.No', 'Account Number', 'Year', 'Month', 'SSNo', 'NRC No', 'First Name', 'Last Name', 'DOB', 'Gross Wage', "Employer's Share", 'Employee Share']
    case '/payroll/nhima_report.php':
      return ['Sl.No', 'Account Number', 'Year', 'Month', 'NHIMA No', 'NRC No', 'First Name', 'Last Name', 'DOB', 'Basic Wage', "Employer's Share", 'Employee Share']
  }
}
