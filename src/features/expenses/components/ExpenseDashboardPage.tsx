import { useMemo, type ComponentType, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Coins, FileText, Hourglass, LayoutDashboard, PieChart as PieChartIcon, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useExpenseApprovals, useExpenseDashboard } from '../expensePages.queries'
import { StatusBadge } from './expenseParts'

// The dashboard prints its numbers and chart data itself (expense/dashboard.php), so this page shows
// exactly those: all-time KPIs, the last six months by last-change date, the top expense types by line
// amount, this year's budgets and the eight most recently changed reports.
const KPI_STYLE: { color: string; icon: ComponentType<{ size?: number; style?: CSSProperties }> }[] = [
  { color: '#397db9', icon: FileText },
  { color: '#f59e0b', icon: Clock },
  { color: '#ef4444', icon: Hourglass },
  { color: '#10b981', icon: CheckCircle2 },
  { color: '#6366f1', icon: Coins },
  { color: '#ef4444', icon: AlertCircle },
]
const TYPE_COLORS = ['#397db9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

// Percent inside its ring segment (segments under 2% are too thin to hold a label).
interface SliceLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}
function sliceLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: SliceLabelProps) {
  if (percent < 0.02) return null
  const r = innerRadius + (outerRadius - innerRadius) / 2
  const rad = Math.PI / 180
  return (
    <text x={cx + r * Math.cos(-midAngle * rad)} y={cy + r * Math.sin(-midAngle * rad)} fill="#fff" fontSize={11.55} fontWeight={600} textAnchor="middle" dominantBaseline="central">
      {(percent * 100).toFixed(1)}%
    </text>
  )
}

const money = (n: number, currency: string, decimals = false) => `${currency ? currency + ' ' : ''}${n.toLocaleString(undefined, decimals ? { minimumFractionDigits: 2 } : undefined)}`

function EmptyChart({ icon: Icon, children }: { icon: ComponentType<{ size?: number }>; children: string }) {
  return (
    <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-text-faint">
      <Icon size={30} />
      <p className="text-sm">{children}</p>
    </div>
  )
}

export function ExpenseDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useExpenseDashboard()
  const approvals = useExpenseApprovals()

  const trend = useMemo(() => (data ? data.months.map((label, i) => ({ label, total: data.trend[i] ?? 0 })) : []), [data])
  const types = useMemo(() => (data ? data.typeLabels.map((label, i) => ({ label: label || 'Unknown', value: data.typeData[i] ?? 0 })) : []), [data])
  const typeTotal = types.reduce((sum, t) => sum + t.value, 0)

  // The dashboard's own "Pending Approval" counts status 1, which nothing in this module ever sets
  // (a submitted report goes straight to status 2), so it always reads 0 while the Approvals tab lists
  // reports waiting. Count what the Approvals tab lists instead.
  const waiting = approvals.data?.filter((r) => r.status === 'Submitted').length

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LayoutDashboard size={20} className="text-brand" /> Expense Dashboard
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading expense dashboard…" />}
      {isError && <LegacyErrorCard title="Couldn't load the expense dashboard" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((k, i) => {
              const { color, icon: Icon } = KPI_STYLE[i] ?? KPI_STYLE[0]
              const value = k.label === 'Pending Approval' && waiting !== undefined ? String(waiting) : k.value
              return (
                <Card key={k.label} className="relative !p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold" style={{ color }}>
                    {value}
                    {k.currency && <span className="ml-1 text-xs font-medium">{k.currency}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-text-faint">{k.sub}</p>
                  <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${color}22` }}>
                    <Icon size={18} style={{ color }} />
                  </span>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-text!">
                <LayoutDashboard size={16} className="text-brand" /> Monthly Expense Trend
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11.55 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11.55 }} axisLine={false} width={104} tickFormatter={(v) => money(Number(v), data.currency)} />
                  <Tooltip formatter={(v) => [money(Number(v), data.currency, true), 'Total TTC']} />
                  <Bar dataKey="total" name="Total TTC" fill="#397db9" radius={[4, 4, 0, 0]} maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-text!">
                <PieChartIcon size={16} className="text-brand" /> By Expense Type
              </h3>
              {typeTotal <= 0 ? (
                <EmptyChart icon={PieChartIcon}>No data yet</EmptyChart>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={types} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="90%" stroke="none" label={sliceLabel} labelLine={false}>
                      {types.map((t, i) => (
                        <Cell key={t.label} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v), data.currency, true)} />
                    <Legend verticalAlign="bottom" iconType="circle" itemSorter={null} wrapperStyle={{ fontSize: 11.55 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[5fr_7fr]">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-text!">
                <Wallet size={16} className="text-brand" /> Budget vs Used{data.budgetYear && ` (${data.budgetYear})`}
              </h3>
              {data.budgets.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center text-text-faint">
                  <Wallet size={30} />
                  <p className="text-sm">No budgets set for this year.</p>
                  <Link to={ROUTES.expensesBudgets} className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10">
                    Set Budgets
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.budgets.map((b) => {
                    const tone = b.pct >= 90 ? 'danger' : b.pct >= 70 ? 'warning' : 'success'
                    return (
                      <div key={b.label}>
                        <div className="mb-1 flex justify-between gap-2 text-xs">
                          <span className="text-text">{b.label}</span>
                          <span className={tone === 'danger' ? 'text-danger-fg' : tone === 'warning' ? 'text-warning-fg' : 'text-success-fg'}>
                            {b.pct}% ({b.used} / {b.budget})
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-neutral-bg">
                          <div
                            className={tone === 'danger' ? 'h-full bg-red-500' : tone === 'warning' ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
                            style={{ width: `${Math.min(b.pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card className="!p-0 overflow-hidden">
              <h3 className="flex items-center gap-2 px-4 pt-4 font-semibold text-text!">
                <Clock size={16} className="text-brand" /> Recent Expenses
              </h3>
              <div className="overflow-x-auto">
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold text-text">
                      <th className="px-4 py-2">Ref</th>
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 italic text-text-faint">
                          No expenses yet.
                        </td>
                      </tr>
                    ) : (
                      data.recent.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-4 py-2">
                            <Link to={ROUTES.expenseCard.replace(':id', r.id)} className="text-brand hover:underline">
                              {r.ref}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-text-muted">{r.user}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-text!">{r.amount}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-xs text-text-muted">{r.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 text-right">
                <Link to={ROUTES.expensesList} className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10">
                  View All <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
