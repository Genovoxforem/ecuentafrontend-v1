import { useMemo, useState, type ReactNode } from 'react'
import { Building2, LineChart as LineChartIcon, PieChart as PieChartIcon, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useExpenseAnalytics } from '../expenseTabs.queries'
import { controlCls } from '../expenseTable'

const TYPE_COLORS = ['#397db9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

const money = (n: number, currency: string, decimals = false) => `${currency ? currency + ' ' : ''}${n.toLocaleString(undefined, decimals ? { minimumFractionDigits: 2 } : undefined)}`

function ChartCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="!h-auto">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-text!">
        <span className="text-brand">{icon}</span> {title}
      </h3>
      {children}
    </Card>
  )
}

const Empty = ({ children }: { children: string }) => <p className="py-16 text-center text-sm text-text-faint">{children}</p>

// expense/analytics.php: a year of spending — by month, by expense type, top employees, by department.
export function ExpenseAnalyticsPage() {
  const [applied, setApplied] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const { data, isLoading, isError, error, refetch } = useExpenseAnalytics(applied)
  const year = draft ?? data?.year ?? ''

  const trend = useMemo(() => (data ? data.months.map((m, i) => ({ month: m, amount: data.amounts[i] ?? 0, count: data.counts[i] ?? 0 })) : []), [data])
  const typeTotal = data?.types.reduce((s, t) => s + t.amount, 0) ?? 0

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LineChartIcon size={20} className="text-brand" /> Expense Analytics
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading the analytics…" />}
      {isError && <LegacyErrorCard title="Couldn't load the analytics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setApplied(year)
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-muted">Year</span>
              <input type="number" value={year} onChange={(e) => setDraft(e.target.value)} className={`${controlCls} w-32`} />
            </label>
            <button type="submit" className="h-9 rounded-md bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover">
              Apply
            </button>
            <span className="pb-2 text-xs text-text-faint">Showing analytics for {data.year}</span>
          </form>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <ChartCard icon={<LineChartIcon size={16} />} title={`Monthly Expense Trend ${data.year}`}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="amount" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={84} tickFormatter={(v) => money(Number(v), data.currency)} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip formatter={(v, name) => (name === 'Total TTC' ? money(Number(v), data.currency, true) : String(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="amount" dataKey="amount" name="Total TTC" fill="#397db9" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Line yAxisId="count" dataKey="count" name="Expenses" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard icon={<PieChartIcon size={16} />} title="By Expense Type">
              {typeTotal <= 0 ? (
                <Empty>No data yet</Empty>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.types} dataKey="amount" nameKey="label" innerRadius="55%" outerRadius="90%" stroke="none">
                      {data.types.map((t, i) => (
                        <Cell key={t.label} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v), data.currency, true)} />
                    <Legend verticalAlign="bottom" iconType="circle" itemSorter={null} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard icon={<Users size={16} />} title="Top Employees by Spend">
              {data.employees.length === 0 ? (
                <Empty>No data yet</Empty>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, data.employees.length * 34 + 40)}>
                  <BarChart data={data.employees} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border, #e5e7eb)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(Number(v), data.currency)} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip formatter={(v) => money(Number(v), data.currency, true)} />
                    <Bar dataKey="amount" name="Total TTC" fill="#397db9" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={<Building2 size={16} />} title="By Department">
              {data.departments.length === 0 ? (
                <Empty>No data yet</Empty>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, data.departments.length * 34 + 40)}>
                  <BarChart data={data.departments} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border, #e5e7eb)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(Number(v), data.currency)} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip formatter={(v) => money(Number(v), data.currency, true)} />
                    <Bar dataKey="amount" name="Total TTC" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
