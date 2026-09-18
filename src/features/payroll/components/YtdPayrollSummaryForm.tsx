import { useMemo, useState } from 'react'
import { BarChart, Eye, Info, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useUsersSummary } from '../../users/users.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SearchType = 'month' | 'year'
const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'month', label: 'By Month' },
  { value: 'year', label: 'By Fiscal Year' },
]

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(value: string) {
  if (!value) return ''
  const [year, month] = value.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// payroll/ytd_summary.php's report table lists the real employee roster
// (confirmed by reading the page directly — a plain GET with no search
// already renders every employee for the current month, same 35-employee
// list every other payroll form here draws from), unlike Generate
// Payslip/YTD Payslip's tables which read llx_payroll_paid_payments rows
// directly and so render nothing at all. Net Salary/Paid Amount show "-"
// for the same reason those other pages have zero rows: that table is only
// ever populated by Make Payment's write, deliberately left unbuilt there
// (see MakePaymentForm.tsx). The row-level view action's popup (real page:
// ajax_search.php?ytdPayList=1&id=<employeeId>, a Bootstrap modal titled
// "Payment Details" with Net Salary/Paid Amount columns) was queried
// directly and returns "Nothing Found" for every employee, so that's what
// this reproduces here too — a static popup, not a live call, since the
// real result never varies while that table has no rows.
export function YtdPayrollSummaryForm() {
  const { data: users } = useUsersSummary()

  const [searchType, setSearchType] = useState<SearchType | ''>('')
  const [month, setMonth] = useState(currentMonthIso())
  const [year, setYear] = useState('')
  const [error, setError] = useState('')
  const [report, setReport] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [viewEmployee, setViewEmployee] = useState<string | null>(null)

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => String(base - 5 + i))
  }, [])

  const rows = useMemo(() => {
    const all = users?.users ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((u) => (u.name || u.login).toLowerCase().includes(q)) : all
  }, [users, search])
  const pageRows = rows.slice((page - 1) * perPage, page * perPage)

  function handleGo() {
    setError('')
    if (!searchType) return setError('Select a search type.')
    if (searchType === 'month') {
      if (!month) return setError('Select a month.')
      setReport(`the month of ${formatMonthLabel(month)}`)
    } else {
      if (!year) return setError('Select a fiscal year.')
      setReport(`Fiscal Year ${year}`)
    }
    setPage(1)
  }
  function handleClear() {
    setSearchType('')
    setMonth(currentMonthIso())
    setYear('')
    setError('')
    setReport(null)
    setSearch('')
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  const heading = report ? `Report For ${report}` : `Report For the month of ${formatMonthLabel(currentMonthIso())}`

  return (
    // -m-6/-mx-6/-top-6: same sticky-header pattern as ManualShiftAttendanceForm.tsx /
    // StickyFormShell.tsx — sticky's offset is measured from the scrolling ancestor's
    // padding edge, so the negative offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <BarChart size={20} className="text-brand" /> YTD Payroll Summary
        </h2>

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">payroll/ytd_summary.php</code>. Employee Name below reflects the real employee roster. Net Salary and
            Paid Amount stay "-", and the view action's Payment Details popup always reads "Nothing Found" — both confirmed directly: that data only ever
            comes from Make Payment's write, deliberately left unbuilt there (see Make Payment's own banner).
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
          {searchType === 'month' && (
            <div>
              <label className="block text-xs text-danger mb-1">Select Month *</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
          )}
          {searchType === 'year' && (
            <div>
              <label className="block text-xs text-danger mb-1">Select Year *</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={`w-full ${inputCls}`}>
                <option value="">Select Year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
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

        <h3 className="text-lg font-bold text-brand text-center">{heading}</h3>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
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
                  <th className="font-medium px-3 py-2">Net Salary</th>
                  <th className="font-medium px-3 py-2">Paid Amount</th>
                  <th className="font-medium px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{u.name || u.login}</td>
                      <td className="px-3 py-2 text-text-faint">-</td>
                      <td className="px-3 py-2 text-text-faint">-</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setViewEmployee(u.name || u.login)}
                          title="Payment Details"
                          className="text-text-muted hover:text-brand"
                        >
                          <Eye size={14} />
                        </button>
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

      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewEmployee(null)}>
          <div className="w-full max-w-md rounded-lg bg-surface border border-border shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text!">Payment Details</h3>
              <button type="button" onClick={() => setViewEmployee(null)} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} />
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-5 py-2">Net Salary</th>
                  <th className="font-medium px-5 py-2">Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={2} className="px-5 py-3 text-text-faint">
                    Nothing Found
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end px-5 py-3 border-t border-border">
              <button type="button" onClick={() => setViewEmployee(null)} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
