import { useMemo, useState } from 'react'
import { LineChart as LineChartIcon, Users, Tags, Building2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllExpenseReports } from '../expenses.queries'
import { formatMoney } from '../../../utils/format'

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}
function parseListDate(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Real via expense/ajax/expense_list.php (length=-1) — Monthly Expense
// Trend and Top Employees by Spend are computed client-side from these real
// rows. This directly fixes a real, confirmed bug: the legacy analytics.php
// page's own 4 charts render permanently blank in the SPA (ApexCharts is
// never injected into the AJAX fragment, and its DOMContentLoaded-gated
// init code can't re-fire once the tab is swapped in client-side — so
// building against genuinely computed real data, rather than reproducing
// that rendering bug, is the intended fix here. "By Expense Type" and "By
// Department" have no JSON
// source at all on this backend (no per-line-item or department data is
// ever exposed as JSON) — shown as honest empty states.
export function ExpenseAnalyticsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const { data, isLoading, isError, error, refetch } = useAllExpenseReports()
  const rows = useMemo(() => data?.rows ?? [], [data])

  const yearRows = useMemo(() => rows.filter((r) => parseListDate(r.dateStart)?.getFullYear() === year), [rows, year])

  const monthlyTrend = useMemo(() => {
    const months = MONTH_NAMES.map((label) => ({ label, Total: 0 }))
    for (const r of yearRows) {
      const d = parseListDate(r.dateCreate)
      if (!d || d.getFullYear() !== year) continue
      months[d.getMonth()].Total += parseAmount(r.totalTtc)
    }
    return months.map((m) => ({ ...m, Total: Math.round(m.Total * 100) / 100 }))
  }, [yearRows, year])

  const topEmployees = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of yearRows) map.set(r.user, (map.get(r.user) ?? 0) + parseAmount(r.totalTtc))
    return Array.from(map.entries())
      .map(([label, Total]) => ({ label, Total: Math.round(Total * 100) / 100 }))
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 10)
  }, [yearRows])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LineChartIcon size={20} className="text-brand" /> Expense Analytics
      </h2>

      <Card className="!h-auto">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-text-muted">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-28 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none" />
          <span className="text-xs text-text-faint">Showing analytics for {year}</span>
        </div>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading analytics…" />}
      {isError && <LegacyErrorCard title="Couldn't load analytics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <Card className="!h-auto">
              <h3 className="font-semibold text-text! mb-3">Monthly Expense Trend {year}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v) => `${formatMoney(Number(v))} ZMW`} />
                  <Bar dataKey="Total" fill="#2a78d6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
                <Tags size={16} className="text-brand" /> By Expense Type
              </h3>
              <div className="min-h-40 flex flex-col items-center justify-center text-center gap-1 py-6">
                <p className="text-sm text-text-muted">Not available</p>
                <p className="text-xs text-text-faint max-w-[260px]">This backend has no JSON API for per-line expense-type amounts.</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
                <Users size={16} className="text-brand" /> Top Employees by Spend
              </h3>
              {topEmployees.length === 0 ? (
                <p className="text-sm text-text-faint italic py-6 text-center">No expenses in {year}.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topEmployees} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border, #e5e7eb)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip formatter={(v) => `${formatMoney(Number(v))} ZMW`} />
                    <Bar dataKey="Total" fill="#2a78d6" radius={[0, 3, 3, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
                <Building2 size={16} className="text-brand" /> By Department
              </h3>
              <div className="min-h-40 flex flex-col items-center justify-center text-center gap-1 py-6">
                <p className="text-sm text-text-muted">Not available</p>
                <p className="text-xs text-text-faint max-w-[260px]">This backend has no JSON API exposing department data.</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
