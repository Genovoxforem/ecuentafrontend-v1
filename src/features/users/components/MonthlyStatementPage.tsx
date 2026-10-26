import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Search } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useMonthlyStatement } from '../hrmFapi'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const selectCls = 'h-9 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

// The classic "Monthly statement" (holiday/month_report.php): the leave of one month. Month and Year pick the month, Search applies them; the
// figures come from userprofile/fapi/hrm.php. The classic form also filters by employee and by leave type, which the endpoint does not take.
export function MonthlyStatementPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [applied, setApplied] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const { data, isLoading, isError, error, refetch } = useMonthlyStatement(applied.month, applied.year)
  const years = Array.from({ length: 16 }, (_, i) => now.getFullYear() + 5 - i)

  function search(e: FormEvent) {
    e.preventDefault()
    setApplied({ month, year })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> Monthly statement
        </h2>
        <Link to={ROUTES.hrmArea} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <ArrowLeft size={14} /> HRM Area
        </Link>
      </div>

      <Card className="!h-auto">
        <form onSubmit={search} className="flex flex-wrap items-center gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls} aria-label="Month">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls} aria-label="Year">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className="flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
            <Search size={14} /> Search
          </button>
        </form>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading the monthly statement…" />}
      {isError && <LegacyErrorCard title="Couldn't load the monthly statement" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <p className="text-sm text-text-muted">
            {MONTHS[data.month - 1]} {data.year} ({data.start} – {data.end})
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Total requests', data.totalRequests],
              ['Employees on leave', data.employeesOnLeave],
              ['Total days', data.totalDays],
            ].map(([label, value]) => (
              <Card key={label} className="!h-auto">
                <p className="text-2xl font-bold text-text!">{value}</p>
                <p className="text-xs text-text-faint">{label}</p>
              </Card>
            ))}
          </div>
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium text-right">Requests</th>
                  <th className="px-4 py-2 font-medium text-right">Days</th>
                </tr>
              </thead>
              <tbody>
                {data.byType.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 italic text-text-faint">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  data.byType.map((t) => (
                    <tr key={t.key} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-text!">{t.type}</td>
                      <td className="px-4 py-2 text-right text-text-muted">{t.requests}</td>
                      <td className="px-4 py-2 text-right text-text-muted">{t.days}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
