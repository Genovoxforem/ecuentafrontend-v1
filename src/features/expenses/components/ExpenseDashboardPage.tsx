import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Clock, CreditCard, CheckCircle2, Layers, AlertCircle, PieChart as PieChartIcon, Wallet2, Target, TrendingUp, TrendingDown, Plus, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Card, ICON_STYLES, fmtZMW, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllExpenseReports, type ExpenseReportRow } from '../expenses.queries'
import { ROUTES } from '../../../routes'

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}
function parseListDate(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

// vs a 0 baseline there's no real ratio to report (division by zero) — 0
// stays flat at 0%, and any positive current value is shown as a flat +100%
// (a new baseline) rather than +Infinity%.
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

function TrendBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0
  const Icon = isUp ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${isUp ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>
      <Icon size={10} /> {isUp ? '+' : ''}
      {pct}%
    </span>
  )
}
function CountBadge({ n }: { n: number }) {
  return <span className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-bg text-neutral-fg">{n} item{n === 1 ? '' : 's'}</span>
}

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
  badge,
}: {
  label: string
  value: string
  caption: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
  badge?: ReactNode
}) {
  return (
    <Card className="!p-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${ICON_STYLES[color]}`}>
          <Icon size={16} />
        </span>
        {badge}
      </div>
      <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wide mt-2">{label}</p>
      <p className="text-2xl font-bold text-text! mt-0.5">{value}</p>
      <p className="text-xs text-text-faint mt-0.5">{caption}</p>
    </Card>
  )
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function EmptyPanel({ icon: Icon, message, ctaLabel, ctaPath }: { icon: ComponentType<{ size?: number; className?: string }>; message: string; ctaLabel: string; ctaPath: string }) {
  return (
    <div className="flex-1 min-h-40 flex flex-col items-center justify-center text-center gap-2 py-6">
      <span className="w-14 h-14 rounded-full grid place-items-center bg-neutral-bg text-text-faint">
        <Icon size={26} />
      </span>
      <p className="text-sm font-semibold text-text-muted">No data available</p>
      <p className="text-xs text-text-faint max-w-[240px]">{message}</p>
      <Link to={ctaPath} className="mt-1 flex items-center gap-1.5 text-xs font-medium rounded-md border border-border px-3 py-1.5 text-text hover:bg-surface-hover">
        <FileText size={12} /> {ctaLabel}
      </Link>
    </div>
  )
}

// Real via expense/ajax/expense_list.php (length=-1, no status filter) — see
// expenses.queries.ts's header comment for the full real-vs-not breakdown.
// KPIs/trend/recent list are computed client-side from these real rows, now
// scoped to the selected year (with trend badges comparing it to the prior
// year) instead of an undifferentiated all-time total. "By Expense Type" and
// "Budget vs Used" have no real JSON source at all on this backend
// (per-line-item amounts and llx_expense_budget are only ever rendered as
// inline HTML by dashboard.php, never exposed as JSON) — shown as honest
// empty states with a real link onward rather than scraped or fabricated.
export function ExpenseDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useAllExpenseReports()
  const rows = useMemo(() => data?.rows ?? [], [data])

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()])
    for (const r of rows) {
      const d = parseListDate(r.dateCreate)
      if (d) set.add(d.getFullYear())
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [rows])
  const [year, setYear] = useState(() => new Date().getFullYear())

  const yearRows = useMemo(() => rows.filter((r) => parseListDate(r.dateCreate)?.getFullYear() === year), [rows, year])
  const prevYearRows = useMemo(() => rows.filter((r) => parseListDate(r.dateCreate)?.getFullYear() === year - 1), [rows, year])

  function summarize(list: ExpenseReportRow[]) {
    const totalExpenses = list.length
    const paid = list.filter((r) => r.paid).length
    // The real dashboard.php's own "Pending Approval" KPI counts fk_statut=1,
    // a status this module never actually sets (submissions go straight from
    // Draft(0) to Submitted(2)) — it would always read 0 on real data. Using
    // "Submitted" here instead gives the number a user actually means by
    // that label.
    const pendingApproval = list.filter((r) => r.status === 'Submitted').length
    const pendingPaymentRows = list.filter((r) => r.status === 'Approved' && !r.paid)
    const totalAmount = list.reduce((sum, r) => sum + parseAmount(r.totalTtc), 0)
    const pendingAmount = pendingPaymentRows.reduce((sum, r) => sum + parseAmount(r.totalTtc), 0)
    return { totalExpenses, paid, pendingApproval, pendingPayment: pendingPaymentRows.length, totalAmount, pendingAmount }
  }
  const stats = useMemo(() => summarize(yearRows), [yearRows])
  const prevStats = useMemo(() => summarize(prevYearRows), [prevYearRows])
  const pendingAmountShare = stats.totalAmount > 0 ? Math.round((stats.pendingAmount / stats.totalAmount) * 100) : 0

  const trend = useMemo(() => {
    const months = MONTH_NAMES.map((label) => ({ label: `${label} ${year}`, Total: 0 }))
    for (const r of yearRows) {
      const d = parseListDate(r.dateCreate)
      if (!d) continue
      months[d.getMonth()].Total += parseAmount(r.totalTtc)
    }
    return months.map((m) => ({ ...m, Total: Math.round(m.Total * 100) / 100 }))
  }, [yearRows, year])

  const recent = useMemo(() => {
    return [...rows]
      .sort((a, b) => (parseListDate(b.dateCreate)?.getTime() ?? 0) - (parseListDate(a.dateCreate)?.getTime() ?? 0))
      .slice(0, 8)
  }, [rows])

  const yearSelect = (
    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none">
      {years.map((y) => (
        <option key={y} value={y}>
          {y === new Date().getFullYear() ? `This Year (${y})` : y}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <LayoutDashboard size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Expense Dashboard</h2>
            <p className="text-xs text-text-faint mt-0.5">Track, manage and analyze your business expenses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {yearSelect}
          <Link to={ROUTES.expensesCreate} className="h-9 flex items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> Add Expense
          </Link>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading expense dashboard…" />}
      {isError && <LegacyErrorCard title="Couldn't load the expense dashboard" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label="Total Expenses" value={String(stats.totalExpenses)} caption={`In ${year}`} icon={Layers} color="blue" badge={<TrendBadge pct={pctChange(stats.totalExpenses, prevStats.totalExpenses)} />} />
            <KpiCard label="Pending Approval" value={String(stats.pendingApproval)} caption="Awaiting review" icon={Clock} color="amber" badge={<CountBadge n={stats.pendingApproval} />} />
            <KpiCard label="Pending Payment" value={String(stats.pendingPayment)} caption="Approved, unpaid" icon={AlertCircle} color="rose" badge={<CountBadge n={stats.pendingPayment} />} />
            <KpiCard label="Paid" value={String(stats.paid)} caption="Fully settled" icon={CheckCircle2} color="green" badge={<CountBadge n={stats.paid} />} />
            <KpiCard label="Total Amount" value={fmtZMW(stats.totalAmount)} caption={`In ${year}`} icon={CreditCard} color="cyan" badge={<TrendBadge pct={pctChange(stats.totalAmount, prevStats.totalAmount)} />} />
            <KpiCard
              label="Pending Amount"
              value={fmtZMW(stats.pendingAmount)}
              caption="To be paid"
              icon={Wallet2}
              color="violet"
              badge={<span className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-bg text-neutral-fg">{pendingAmountShare}%</span>}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-stretch">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-text!">Monthly Expense Trend</h3>
                  <p className="text-xs text-text-faint mt-0.5">Total expenses by month</p>
                </div>
                {yearSelect}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="label" tickFormatter={(v: string) => v.split(' ')[0]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v) => fmtZMW(Number(v))} />
                  <Bar dataKey="Total" name="Expenses (ZMW)" fill="#2a78d6" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
                <PieChartIcon size={16} className="text-brand" /> Expenses by Type
              </h3>
              <EmptyPanel
                icon={PieChartIcon}
                message="This backend has no JSON API for per-line expense-type amounts — only server-rendered HTML."
                ctaLabel="View All Expenses"
                ctaPath={ROUTES.expensesList}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.65fr_1.35fr] gap-4 items-stretch">
            <Card>
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-1">
                <Target size={16} className="text-brand" /> Budget vs Used
              </h3>
              <p className="text-xs text-text-faint">Compare budgeted vs actual expenses</p>
              <EmptyPanel
                icon={Target}
                message="Budgets (llx_expense_budget) have no JSON API on this backend — only server-rendered HTML."
                ctaLabel="Go to Budgets"
                ctaPath={ROUTES.expensesBudgets}
              />
            </Card>

            <Card className="!p-0 overflow-x-auto">
              <div className="flex items-center justify-between p-4 pb-0">
                <h3 className="font-semibold text-text!">Recent Expenses</h3>
                <Link to={ROUTES.expensesList} className="text-sm text-brand hover:underline">
                  View All
                </Link>
              </div>
              <table className="w-full text-sm mt-3 mb-3">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-3 py-2">#</th>
                    <th className="font-medium px-3 py-2">Reference</th>
                    <th className="font-medium px-3 py-2">User</th>
                    <th className="font-medium px-3 py-2 text-right">Amount</th>
                    <th className="font-medium px-3 py-2">Status</th>
                    <th className="font-medium px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-text-faint italic">
                        No expenses yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((r: ExpenseReportRow, i) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text-faint">{i + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Link to={ROUTES.expenseReportDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                            {r.ref}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.user}</td>
                        <td className="px-3 py-2 text-right text-text! whitespace-nowrap">{r.totalTtc}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${r.paid ? 'bg-success-bg text-success-fg' : 'bg-info-bg text-info-fg'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" /> {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateCreate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
