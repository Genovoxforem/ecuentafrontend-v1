import { useMemo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Clock, CreditCard, CheckCircle2, Layers, AlertCircle, PieChart as PieChartIcon, Wallet2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllExpenseReports, type ExpenseReportRow } from '../expenses.queries'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}
function parseListDate(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function KpiCard({ label, value, caption, icon: Icon, color }: { label: string; value: string; caption: string; icon: ComponentType<{ size?: number }>; color: IconColor }) {
  return (
    <Card className="!h-auto !p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wide">{label}</p>
        <span className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${ICON_STYLES[color]}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="text-2xl font-bold text-text! mt-1">{value}</p>
      <p className="text-xs text-text-faint mt-0.5">{caption}</p>
    </Card>
  )
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Real via expense/ajax/expense_list.php (length=-1, no status filter) — see
// expenses.queries.ts's header comment for the full real-vs-not breakdown.
// KPIs/trend/recent list are computed client-side from these real rows.
// "By Expense Type" and "Budget vs Used" have no real JSON source at all on
// this backend (per-line-item amounts and llx_expense_budget are only ever
// rendered as inline HTML by dashboard.php, never exposed as JSON) — shown
// as honest empty states rather than scraped or fabricated.
export function ExpenseDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useAllExpenseReports()
  const rows = useMemo(() => data?.rows ?? [], [data])

  const stats = useMemo(() => {
    const totalExpenses = rows.length
    const paid = rows.filter((r) => r.paid).length
    // The real dashboard.php's own "Pending Approval" KPI counts fk_statut=1,
    // a status this module never actually sets (submissions go straight from
    // Draft(0) to Submitted(2)) — it would always read 0 on real data. Using
    // "Submitted" here instead gives the number a user actually means by
    // that label.
    const pendingApproval = rows.filter((r) => r.status === 'Submitted').length
    const pendingPaymentRows = rows.filter((r) => r.status === 'Approved' && !r.paid)
    const totalAmount = rows.reduce((sum, r) => sum + parseAmount(r.totalTtc), 0)
    const pendingAmount = pendingPaymentRows.reduce((sum, r) => sum + parseAmount(r.totalTtc), 0)
    return { totalExpenses, paid, pendingApproval, pendingPayment: pendingPaymentRows.length, totalAmount, pendingAmount }
  }, [rows])

  const trend = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), total: 0 }
    })
    for (const r of rows) {
      const d = parseListDate(r.dateCreate)
      if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) bucket.total += parseAmount(r.totalTtc)
    }
    return months.map((m) => ({ label: `${m.label} ${m.year}`, Total: Math.round(m.total * 100) / 100 }))
  }, [rows])

  const recent = useMemo(() => {
    return [...rows]
      .sort((a, b) => (parseListDate(b.dateCreate)?.getTime() ?? 0) - (parseListDate(a.dateCreate)?.getTime() ?? 0))
      .slice(0, 8)
  }, [rows])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LayoutDashboard size={20} className="text-brand" /> Expense Dashboard
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading expense dashboard…" />}
      {isError && <LegacyErrorCard title="Couldn't load the expense dashboard" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label="Total Expenses" value={String(stats.totalExpenses)} caption="All time" icon={Layers} color="blue" />
            <KpiCard label="Pending Approval" value={String(stats.pendingApproval)} caption="Awaiting review" icon={Clock} color="amber" />
            <KpiCard label="Pending Payment" value={String(stats.pendingPayment)} caption="Approved, unpaid" icon={AlertCircle} color="rose" />
            <KpiCard label="Paid" value={String(stats.paid)} caption="Fully settled" icon={CheckCircle2} color="green" />
            <KpiCard label="Total Amount" value={`${formatMoney(stats.totalAmount)} ZMW`} caption="Fully settled" icon={CreditCard} color="cyan" />
            <KpiCard label="Pending Amount" value={`${formatMoney(stats.pendingAmount)} ZMW`} caption="To be paid" icon={Wallet2} color="violet" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
            <Card className="!h-auto">
              <h3 className="font-semibold text-text! mb-3">Monthly Expense Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v) => `${formatMoney(Number(v))} ZMW`} />
                  <Bar dataKey="Total" fill="#2a78d6" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
                <PieChartIcon size={16} className="text-brand" /> By Expense Type
              </h3>
              <div className="min-h-40 flex flex-col items-center justify-center text-center gap-1 py-6">
                <p className="text-sm text-text-muted">Not available</p>
                <p className="text-xs text-text-faint max-w-[220px]">This backend has no JSON API for per-line expense-type amounts — only server-rendered HTML.</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 items-start">
            <Card className="!h-auto">
              <h3 className="font-semibold text-text! mb-3">Budget vs Used</h3>
              <div className="min-h-32 flex flex-col items-center justify-center text-center gap-1 py-6">
                <p className="text-sm text-text-muted">Not available</p>
                <p className="text-xs text-text-faint max-w-xs">Budgets (llx_expense_budget) have no JSON API on this backend — only server-rendered HTML.</p>
              </div>
            </Card>

            <Card className="!h-auto !p-0 overflow-x-auto">
              <div className="flex items-center justify-between p-4 pb-0">
                <h3 className="font-semibold text-text!">Recent Expenses</h3>
              </div>
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-4 py-2">Ref</th>
                    <th className="font-medium px-4 py-2">User</th>
                    <th className="font-medium px-4 py-2 text-right">Amount</th>
                    <th className="font-medium px-4 py-2">Status</th>
                    <th className="font-medium px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                        No expenses yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((r: ExpenseReportRow) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2">
                          <Link to={ROUTES.expenseReportDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                            {r.ref}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-text-muted">{r.user}</td>
                        <td className="px-4 py-2 text-right text-text!">{r.totalTtc}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.paid ? 'bg-success-bg text-success-fg' : 'bg-info-bg text-info-fg'}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-2 text-text-muted whitespace-nowrap">{r.dateCreate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex justify-end p-3">
                <Link to={ROUTES.expensesList} className="text-sm text-brand hover:underline flex items-center gap-1">
                  View All →
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
