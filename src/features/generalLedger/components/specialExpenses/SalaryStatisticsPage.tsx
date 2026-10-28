import { useState } from 'react'
import { BadgeDollarSign } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../../products/components/LegacyReportStates'
import { formatMoney } from '../../../../utils/format'
import { monthSeries, useSalaryEmployees, useSalaryStats, type SalaryStats } from '../../salaryStats.queries'

const selectCls = 'h-9 w-full max-w-sm px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function MonthChart({ title, stats, field }: { title: string; stats: SalaryStats; field: 'count' | 'amount' | 'average' }) {
  return (
    <Card className="!h-auto">
      <h2 className="mb-2 text-sm font-semibold uppercase text-text!">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthSeries(stats, field)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={field !== 'count'} />
            <Tooltip formatter={(v) => (field === 'count' ? String(v) : formatMoney(Number(v)))} />
            <Legend />
            <Bar dataKey={String(stats.previous_year)} fill="#94a3b8" />
            <Bar dataKey={String(stats.year)} fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// salaries/stats/index.php — Salary statistics, "By month/year": the User and Year filters with Refresh, the
// Year / Number / Total amount / Average amount table, and the three month charts (number, total amount, average).
export function SalaryStatisticsPage() {
  const [userId, setUserId] = useState('')
  const [year, setYear] = useState<number | undefined>(undefined)
  const [draft, setDraft] = useState({ userId: '', year: '' })
  const { data, isLoading, isError, error, refetch } = useSalaryStats(year, userId)
  const { data: employees } = useSalaryEmployees()

  if (isLoading) return <LegacyLoadingCard label="Loading the salary statistics..." />
  if (isError || !data) return <LegacyErrorCard title="Could not load the salary statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const thisYear = new Date().getFullYear()
  const years = Array.from(new Set([thisYear, data.year, data.previous_year, ...data.by_year.map((r) => r.year)])).sort((a, b) => b - a)

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-text!">
        <BadgeDollarSign size={18} /> Salary statistics
      </h1>
      <Card className="!h-auto">
        <form
          className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center"
          onSubmit={(e) => {
            e.preventDefault()
            setUserId(draft.userId)
            setYear(draft.year ? Number(draft.year) : undefined)
          }}
        >
          <label className="text-xs font-medium text-text-faint" htmlFor="sal-user">User</label>
          <select id="sal-user" className={selectCls} value={draft.userId} onChange={(e) => setDraft({ ...draft, userId: e.target.value })}>
            <option value="">All users</option>
            {(employees ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <label className="text-xs font-medium text-text-faint" htmlFor="sal-year">Year</label>
          <select id="sal-year" className={selectCls} value={draft.year || String(data.year)} onChange={(e) => setDraft({ ...draft, year: e.target.value })}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">Refresh</button>
          </div>
        </form>
      </Card>

      <Card className="!h-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-faint">
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2 text-right">Number</th>
                <th className="px-3 py-2 text-right">Total amount</th>
                <th className="px-3 py-2 text-right">Average amount</th>
              </tr>
            </thead>
            <tbody>
              {data.by_year.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-text-faint">No salary payments recorded.</td></tr>
              ) : (
                data.by_year.map((r) => (
                  <tr key={r.year} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{r.year}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.count ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.amount ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.average ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <MonthChart title="Total reports by month" stats={data} field="count" />
        <MonthChart title="Total amount" stats={data} field="amount" />
        <MonthChart title="Average amount" stats={data} field="average" />
      </div>
    </div>
  )
}
