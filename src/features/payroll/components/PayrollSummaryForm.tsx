import { useMemo, useState } from 'react'
import { Funnel, Info, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useUsersSummary } from '../../users/users.queries'
import { usePayrollSummaryReport, type PayrollSummarySearch } from '../payrollSummaryReport.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SearchType = 'employee' | 'month'
const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'employee', label: 'By Employee' },
  { value: 'month', label: 'By Month' },
]

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// payroll/payroll_summary.php's report table is scraped for real — see
// payrollSummaryReportParser.ts's own top comment for how this was
// confirmed live (a By Employee search for employee 11 returned a genuine
// May 2026 paid-payment row) — unlike this module's other Salary Payments
// pages, which were checked and found genuinely empty for every case tried.
export function PayrollSummaryForm() {
  const { data: users } = useUsersSummary()

  const [searchType, setSearchType] = useState<SearchType | ''>('')
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(currentMonthIso())
  const [error, setError] = useState('')
  const [appliedSearch, setAppliedSearch] = useState<PayrollSummarySearch | null>(null)
  const [filterText, setFilterText] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const employeeOptions = useMemo(() => (users?.users ?? []).map((u) => ({ value: String(u.id), label: u.name || u.login })), [users])

  const { data: reportRows, isFetching, isError, error: queryError } = usePayrollSummaryReport(appliedSearch)

  const rows = useMemo(() => {
    const all = reportRows ?? []
    const q = filterText.trim().toLowerCase()
    return q ? all.filter((r) => r.employeeName.toLowerCase().includes(q)) : all
  }, [reportRows, filterText])
  const pageRows = rows.slice((page - 1) * perPage, page * perPage)

  function handleGo() {
    setError('')
    if (!searchType) return setError('Select a search type.')
    if (searchType === 'employee') {
      if (!employeeId) return setError('Select an employee.')
      setAppliedSearch({ type: 'employee', employeeId })
    } else {
      if (!month) return setError('Select a month.')
      setAppliedSearch({ type: 'month', month })
    }
    setFilterText('')
    setPage(1)
  }
  function handleClear() {
    setSearchType('')
    setEmployeeId('')
    setMonth(currentMonthIso())
    setError('')
    setAppliedSearch(null)
    setFilterText('')
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6/-mx-6/-top-6: same sticky-header pattern as ManualShiftAttendanceForm.tsx /
    // StickyFormShell.tsx — sticky's offset is measured from the scrolling ancestor's
    // padding edge, so the negative offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Funnel size={20} className="text-brand" /> Payroll Summary
        </h2>

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">payroll/payroll_summary.php</code>. This report's rows are real, scraped directly from the backend
            (confirmed live — some employees do have real paid-payment history). The row-level Action popup (a full printable payslip layout) isn't
            reproduced — it re-presents the same row's own numbers plus employee profile fields already available from Users.
          </p>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-danger mb-1">Search Type *</label>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value as SearchType)} className={`w-full ${inputCls}`}>
              <option value="">Select Search Type</option>
              {SEARCH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {searchType === 'employee' && (
            <div>
              <label className="block text-xs text-danger mb-1">Employee Name *</label>
              <SearchableSelect value={employeeId} onChange={setEmployeeId} options={employeeOptions} placeholder="Select Employee..." />
            </div>
          )}
          {searchType === 'month' && (
            <div>
              <label className="block text-xs text-danger mb-1">Select Month *</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handleGo} className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
              Go
            </button>
            <button type="button" onClick={handleClear} className="h-9 rounded-md border border-input-border px-4 text-sm font-medium text-text-muted hover:bg-surface-hover">
              Clear
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
            <input
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value)
                setPage(1)
              }}
              placeholder="Search"
              className={`w-64 ${inputCls}`}
            />
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="ml-auto text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Employee Name</th>
                  <th className="font-medium px-3 py-2">Month</th>
                  <th className="font-medium px-3 py-2">Date Of Paid</th>
                  <th className="font-medium px-3 py-2">Gross Salary</th>
                  <th className="font-medium px-3 py-2">Total Deduction</th>
                  <th className="font-medium px-3 py-2">Net Salary</th>
                  <th className="font-medium px-3 py-2">Fine Deduction</th>
                  <th className="font-medium px-3 py-2">Paid Amount</th>
                  <th className="font-medium px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin" /> Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-danger">
                      {queryError instanceof Error ? queryError.message : "Couldn't load the report."}
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={`${r.employeeName}-${r.month}-${i}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{r.employeeName}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.month}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateOfPaid}</td>
                      <td className="px-3 py-2 text-text-muted">{r.grossSalary}</td>
                      <td className="px-3 py-2 text-text-muted">{r.totalDeduction}</td>
                      <td className="px-3 py-2 text-text-muted">{r.netSalary}</td>
                      <td className="px-3 py-2 text-text-muted">{r.fineDeduction}</td>
                      <td className="px-3 py-2 text-text-muted">{r.paidAmount}</td>
                      <td className="px-3 py-2">
                        <span title="Full payslip breakdown isn't reproduced here — see the banner above" className="text-text-faint opacity-60 cursor-not-allowed">
                          View
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={page} perPage={perPage} total={rows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
