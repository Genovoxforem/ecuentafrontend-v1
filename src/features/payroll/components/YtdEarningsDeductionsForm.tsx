import { useMemo, useState } from 'react'
import { FileSpreadsheet, Info, LoaderCircle, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { MonthYearPicker, monthIsoToLabel } from '../../../shared/components/forms/MonthYearPicker'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useYtdEarningsDeductions, type YtdEarningsDeductionsSearchType } from '../payrollLists.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Real via payroll/earn_dedu.php — see payrollLists.queries.ts's
// useYtdEarningsDeductions and ytdEarningsDeductionsParser.ts for the full
// investigation. "By Month" always comes back with just an Employee Name
// column (no paid-payment records exist — same real gap as Generate/YTD
// Payslip). "By Fiscal Year" is genuinely computed live from each
// employee's assigned Salary Template, columns and all — rendered exactly
// as the backend returns them rather than assuming a fixed shape, since
// the Deductions column count is backend-driven and not something this app
// controls or should guess at.
export function YtdEarningsDeductionsForm() {
  const [searchType, setSearchType] = useState<YtdEarningsDeductionsSearchType>('')
  const [monthValue, setMonthValue] = useState('')
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()))
  const [appliedType, setAppliedType] = useState<YtdEarningsDeductionsSearchType>('')
  const [appliedValue, setAppliedValue] = useState('')
  const [formError, setFormError] = useState('')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const { data: report, isLoading, isError, error, refetch, isFetching } = useYtdEarningsDeductions(appliedType, appliedValue)

  function handleGo() {
    if (!searchType) return setFormError('Type Required!')
    if (searchType === 'month') {
      if (!monthValue) return setFormError('Select Month!')
      setFormError('')
      setAppliedType('month')
      setAppliedValue(monthIsoToLabel(monthValue))
    } else {
      if (!yearValue) return setFormError('Select Fiscal Year!')
      setFormError('')
      setAppliedType('year')
      setAppliedValue(yearValue)
    }
    setPage(1)
  }

  function handleClear() {
    setSearchType('')
    setMonthValue('')
    setYearValue(String(new Date().getFullYear()))
    setFormError('')
    setAppliedType('')
    setAppliedValue('')
    setSearch('')
    setPage(1)
  }

  const allRows = useMemo(() => report?.rows ?? [], [report])
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((r) => r.employeeName.toLowerCase().includes(q))
  }, [allRows, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Employee Name', ...(report?.columns ?? [])],
      rows: filteredRows.map((r) => [r.employeeName, ...r.values]),
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
            <h2 className="text-lg font-bold text-text!">YTD Earnings & Deductions</h2>
            <p className="text-xs text-text-faint mt-0.5">Year-to-date earnings and deductions, by month or by fiscal year.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-danger mb-1">Search Type *</label>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value as YtdEarningsDeductionsSearchType)} className={inputCls}>
              <option value="">Select Search Type</option>
              <option value="month">By Month</option>
              <option value="year">By Fiscal Year</option>
            </select>
          </div>
          {searchType === 'month' && (
            <div>
              <label className="block text-xs text-danger mb-1">Select Month *</label>
              <MonthYearPicker value={monthValue} onChange={setMonthValue} />
            </div>
          )}
          {searchType === 'year' && (
            <div>
              <label className="block text-xs text-danger mb-1">Select Year *</label>
              <input
                type="number"
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                className={`${inputCls} w-28`}
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleGo}
            disabled={isFetching}
            className="h-9 flex items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {isFetching ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />} Go
          </button>
          <button type="button" onClick={handleClear} className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-hover">
            Clear
          </button>
          {formError && <p className="text-xs text-danger">{formError}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">payroll/earn_dedu.php</code>. "By Month" always shows Employee Name only — it reads the same real
            paid-payment records as Generate/YTD Payslip, which this app never writes to (see Make Payment's own note), so there's nothing to show yet. "By
            Fiscal Year" is genuinely computed live from each employee's assigned Salary Template — rendered exactly as the backend returns it, including
            its own repeated Deductions columns (a real backend quirk, not something added here).
          </p>
        </Card>

        {isLoading && <LegacyLoadingCard label="Loading report…" />}
        {isError && <LegacyErrorCard title="Couldn't load report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {report && (
          <>
            <h3 className="text-lg font-bold text-brand text-center">{report.heading}</h3>

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
                <h3 className="font-semibold text-text!">Employees</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value))
                      setPage(1)
                    }}
                    className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search by employee name…"
                    className={`w-64 ${inputCls}`}
                  />
                  <TableExportButtons title="YTD Earnings & Deductions" getExportData={getExportData} />
                </div>
              </div>

              {filteredRows.length === 0 ? (
                <p className="text-sm text-text-faint italic py-6 text-center">No employees match this search.</p>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-surface">
                      {report.groups.length > 0 && (
                        <tr className="text-center text-xs text-text-faint uppercase tracking-wide border-b border-border">
                          <th className="font-medium px-3 py-1.5" />
                          {report.groups.map((g, i) => (
                            <th key={i} colSpan={g.colSpan} className="font-medium px-3 py-1.5 border-l border-border">
                              {g.label}
                            </th>
                          ))}
                        </tr>
                      )}
                      <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                        <th className="font-medium px-3 py-2 whitespace-nowrap">Employee Name</th>
                        {report.columns.map((c, i) => (
                          <th key={i} className="font-medium px-3 py-2 text-center whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 text-text! whitespace-nowrap">{r.employeeName}</td>
                          {r.values.map((v, j) => (
                            <td key={j} className="px-3 py-2.5 text-center text-text-muted whitespace-nowrap">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {report && <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
