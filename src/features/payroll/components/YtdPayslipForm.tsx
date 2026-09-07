import { useMemo, useState } from 'react'
import { FileText, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useUsersSummary } from '../../users/users.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

type SearchType = 'emp' | 'month' | 'year'
const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'emp', label: 'By Employee' },
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

// payroll/ytd_payslip.php's own table reads the exact same
// llx_payroll_paid_payments table as Generate Payslip — real query, read
// directly, no JSON API — and that table is only ever populated by
// payroll/ajax.php?savePayment (Make Payment's write), deliberately left
// unbuilt there since its formula can't be reproduced honestly (see
// MakePaymentForm.tsx). So this list has no rows either, and there's no
// "View" YTD payslip to open — same reasoning as GeneratePayslipForm.tsx.
export function YtdPayslipForm() {
  const { data: users } = useUsersSummary()

  const [searchType, setSearchType] = useState<SearchType | ''>('')
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(currentMonthIso())
  const [year, setYear] = useState('')
  const [error, setError] = useState('')
  const [report, setReport] = useState<{ type: SearchType; label: string } | null>(null)

  const employeeOptions = useMemo(() => (users?.users ?? []).map((u) => ({ value: String(u.id), label: u.name || u.login })), [users])
  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => String(base - 5 + i))
  }, [])

  function handleGo() {
    setError('')
    if (!searchType) return setError('Select a search type.')
    if (searchType === 'emp') {
      const employee = users?.users.find((u) => String(u.id) === employeeId)
      if (!employee) return setError('Select an employee.')
      setReport({ type: 'emp', label: employee.name || employee.login })
    } else if (searchType === 'month') {
      if (!month) return setError('Select a month.')
      setReport({ type: 'month', label: `the month of ${formatMonthLabel(month)}` })
    } else {
      if (!year) return setError('Select a year.')
      setReport({ type: 'year', label: `Fiscal Year ${year}` })
    }
  }

  function handleClear() {
    setSearchType('')
    setEmployeeId('')
    setMonth(currentMonthIso())
    setYear('')
    setError('')
    setReport(null)
  }

  const heading = report ? `Report For ${report.label}` : `Report For the month of ${formatMonthLabel(currentMonthIso())}`

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> YTD Payslip
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/ytd_payslip.php</code>. It reads the same real paid-payment records as Generate Payslip, which
          are only ever created by Make Payment's write — deliberately left unbuilt there (see Make Payment's own banner) — so this list has no rows to
          show, and there's no YTD payslip detail to open.
        </p>
      </Card>

      <Card className="!h-auto">
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
          {searchType === 'emp' && (
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
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </Card>

      <h3 className="text-lg font-bold text-brand text-center">{heading}</h3>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Employee Name</th>
                <th className="font-medium px-3 py-2">Month</th>
                <th className="font-medium px-3 py-2">Date Of Paid</th>
                <th className="font-medium px-3 py-2">Salary Type</th>
                <th className="font-medium px-3 py-2">Basic Salary</th>
                <th className="font-medium px-3 py-2">Net Salary</th>
                <th className="font-medium px-3 py-2">Paid Amount</th>
                <th className="font-medium px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
