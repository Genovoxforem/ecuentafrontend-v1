import {
  Landmark,
  TrendingUp,
  TrendingDown,
  FileText,
  ShoppingCart,
  Package,
  ClipboardList,
  FileSignature,
  Wallet,
  CheckCircle2,
  Scale,
  RotateCcw,
  BarChart3,
  Users,
  FileEdit,
  BadgeCheck,
  XCircle,
  Globe,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { WorldMapDecoration } from './WorldMapDecoration'
import { RadialGauge } from './RadialGauge'
import { AnimatedCounter } from './AnimatedCounter'
import { StatCard, GlassCard, CardHeader, type StatTone } from './DashboardCards'
import type { DashboardSummary } from '../home.queries'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DONUT_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-8)']
const STATUS_STYLES: Record<number, { label: string; cls: string; icon: LucideIcon }> = {
  0: { label: 'Draft', cls: 'bg-neutral-bg text-neutral-fg', icon: FileEdit },
  1: { label: 'Validated', cls: 'bg-warning-bg text-warning-fg', icon: CheckCircle2 },
  2: { label: 'Paid', cls: 'bg-info-bg text-info-fg', icon: BadgeCheck },
  3: { label: 'Abandoned', cls: 'bg-danger-bg text-danger-fg', icon: XCircle },
}

const fmtMoney = (n: number | string) => `${formatMoney(n)} ZMW`
const fmtNumber = formatMoney
const fmtCount = (n: number) => String(n)

function fmtAxisMoney(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}K`
  return String(n)
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTH_SHORT[m - 1]} ${String(d).padStart(2, '0')}, ${y}`
}
function addYears(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y + n}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function fmtInvoiceDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()},${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

const TONE_CLS: Record<StatTone, string> = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-info-bg text-info-fg',
  danger: 'bg-danger-bg text-danger-fg',
}

function IconStat({
  icon: Icon,
  value,
  label,
  tone = 'brand',
}: {
  icon: LucideIcon
  value: ReactNode
  label: string
  tone?: StatTone
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${TONE_CLS[tone]}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold text-text! leading-tight truncate">{value}</p>
        <p className="text-[11px] text-text-muted leading-tight truncate">{label}</p>
      </div>
    </div>
  )
}

function ChangeBadge({ percent, up }: { percent: number; up: boolean }) {
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-success' : 'text-danger'}`}>
      <Icon size={10} />
      {Math.abs(percent).toFixed(1)}%
    </span>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  if (hour < 21) return 'Good Evening'
  return 'Good Night'
}

function getGreetingEmoji() {
  const hour = new Date().getHours()
  if (hour < 12) return '\u{1F305}'
  if (hour < 17) return '\u{2600}\u{FE0F}'
  if (hour < 21) return '\u{1F307}'
  return '\u{1F319}'
}

// Premium tooltip for recharts — glass surface with brand accent border.
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-xl shadow-black/10">
      <p className="text-xs font-semibold text-text mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color || entry.fill }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="font-semibold text-text tabular-nums">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function HomeOverview({ username, summary }: { username: string; summary: DashboardSummary }) {
  const [tab, setTab] = useState<'Sales' | 'Purchase'>('Sales')

  const { today, zra, banks, salesBreakdown, purchaseBreakdown, monthly, months, period, legacyCounts, recentSales, salesByCurrency } = summary

  const todayTotal = today.invoices_count + today.purchases_count
  const salesSharePct = todayTotal > 0 ? (today.invoices_count / todayTotal) * 100 : 50
  const purchaseSharePct = todayTotal > 0 ? (today.purchases_count / todayTotal) * 100 : 50

  const breakdown = tab === 'Sales' ? salesBreakdown : purchaseBreakdown
  const donutData = [
    { name: 'Draft', value: Number(breakdown.draft_count) },
    { name: 'Validated', value: Number(breakdown.validated_count) },
  ]
  const donutTotal = Number(breakdown.draft_count) + Number(breakdown.validated_count)
  const balanceAmount = Number(breakdown.total_amount) - Number(breakdown.paid_amount)

  const monthlyByYm = new Map(monthly.map((m) => [m.ym, m]))
  const analyticsData = months.map((ym) => {
    const row = monthlyByYm.get(ym)
    return {
      month: MONTH_SHORT[Number(ym.split('-')[1]) - 1],
      income: row ? Number(row.income) : 0,
      sales: row ? Number(row.sales_count) : 0,
      customers: row ? Number(row.customers) : 0,
    }
  })
  const yearIncome = analyticsData.reduce((sum, m) => sum + m.income, 0)
  const yearSales = analyticsData.reduce((sum, m) => sum + m.sales, 0)
  const yearCustomers = Math.max(...analyticsData.map((m) => m.customers), 0)

  const currencyMax = Math.max(...salesByCurrency.map((row) => Number(row.total)), 0)
  const bankBalanceMax = Math.max(...banks.map((b) => Math.abs(Number(b.balance))), 0)

  return (
    <div className="space-y-4">
      {/* ── Row 1: Hero banner + top stat cards ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Hero banner */}
        <div className="xl:col-span-5 relative overflow-hidden rounded-2xl p-5 bg-[linear-gradient(135deg,var(--color-hero-from)_0%,var(--color-hero-via)_55%,var(--color-surface)_100%)] border border-border shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getGreetingEmoji()}</span>
              <h2 className="text-xl font-bold text-hero-heading">
                {getGreeting()}, {username}!
              </h2>
            </div>
            <p className="text-text-muted text-sm">Here&apos;s what&apos;s happening with your store today</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {(
                [
                  ['Sales Today', today.invoices_count, today.sales_amount, salesSharePct, 'var(--color-chart-1)'],
                  ['Purchase Today', today.purchases_count, today.purchases_amount, purchaseSharePct, 'var(--color-chart-2)'],
                ] as const
              ).map(([label, count, amount, pct, color]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 py-3 flex items-center gap-3 backdrop-blur-sm"
                >
                  <RadialGauge percent={pct} size={64} strokeWidth={6} color={color}>
                    <AnimatedCounter value={count} className="text-base font-bold text-hero-heading leading-none" />
                  </RadialGauge>
                  <div className="min-w-0">
                    <p className="text-text-muted text-xs @sm:text-[13px] leading-tight font-medium">{label}</p>
                    <p className="text-sm @sm:text-base font-bold text-hero-heading truncate">{fmtMoney(amount)}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Today&apos;s Refund <span className="font-semibold text-hero-heading">{fmtMoney(today.refund_amount)}</span>
            </p>
          </div>
        </div>

        {/* Top stat cards row */}
        <div className="xl:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Receipt}
            label="Total Invoices"
            value={salesBreakdown.draft_count + salesBreakdown.validated_count}
            format={fmtCount}
            sublabel={`${salesBreakdown.validated_count} validated`}
            tone="brand"
          />
          <StatCard
            icon={Wallet}
            label="Total Revenue"
            value={Number(salesBreakdown.total_amount)}
            format={(n) => fmtMoney(n)}
            sublabel={`${fmtMoney(salesBreakdown.paid_amount)} paid`}
            tone="success"
          />
          <StatCard
            icon={Users}
            label="Customers"
            value={legacyCounts.salesOrders.value}
            format={fmtCount}
            sublabel={`${legacyCounts.shipments.value} shipments`}
            tone="info"
          />
          <StatCard
            icon={BadgeCheck}
            label="ZRA Signed"
            value={zra.signedInvoices.value}
            format={fmtCount}
            sublabel={zra.totalSale.value > 0 ? fmtMoney(zra.totalSale.value) : 'No data'}
            tone="warning"
          />
        </div>
      </div>

      {/* ── Row 2: Donut breakdown + Sales Analytics chart ──────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Sales/Purchase breakdown donut */}
        <GlassCard
          className="xl:col-span-3 flex flex-col h-full"
          header={
            <div className="flex items-center gap-2">
              {([
                ['Sales', ShoppingCart],
                ['Purchase', Package],
              ] as const).map(([t, TabIcon]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-text-muted hover:bg-surface-alt'}`}
                >
                  <TabIcon size={13} />
                  {t}
                </button>
              ))}
            </div>
          }
          action={<span className="text-xs px-2.5 py-1 rounded-full bg-surface-alt text-text-muted">Whole Year</span>}
        >
          <div className="flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={34} outerRadius={46} paddingAngle={3} stroke="none">
                      {donutData.map((entry, i) => (
                        <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-text-muted">Total {tab}</p>
                  <AnimatedCounter value={donutTotal} className="text-lg font-bold text-text" />
                </div>
              </div>

              <div className="grid grid-cols-1 @xs:grid-cols-2 gap-3 flex-1 min-w-0">
                <IconStat icon={FileEdit} value={breakdown.draft_count} label="Draft" tone="warning" />
                <IconStat icon={CheckCircle2} value={breakdown.validated_count} label="Validated" tone="success" />
              </div>
            </div>

            {tab === 'Sales' && (
              <div className="grid grid-cols-1 @xs:grid-cols-3 gap-3 pt-4 border-t border-border">
                <IconStat icon={ClipboardList} value={legacyCounts.salesOrders.value} label="Sales Orders" tone="brand" />
                <IconStat icon={FileText} value={legacyCounts.quotationsCount} label="Quotations" tone="info" />
                <IconStat icon={FileSignature} value={legacyCounts.contracts.value} label="Contracts" tone="brand" />
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-2.5 text-sm">
              {(
                [
                  [Wallet, tab === 'Sales' ? 'Total Sale Amount' : 'Total Purchase Amount', fmtMoney(breakdown.total_amount)],
                  [CheckCircle2, 'Paid Amount', fmtMoney(breakdown.paid_amount)],
                  [Scale, 'Balance Amount', fmtMoney(balanceAmount)],
                  [RotateCcw, 'Total Refund', fmtMoney(tab === 'Sales' ? summary.totalRefund : 0)],
                ] as const
              ).map(([RowIcon, label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-text-muted">
                    <RowIcon size={13} className="text-text-faint" />
                    {label}
                  </span>
                  <span className="text-text font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Sales Analytics composed chart */}
        <GlassCard
          className="xl:col-span-6"
          header={
            <CardHeader
              icon={BarChart3}
              title="Sales Analytics"
              subtitle={`${fmtDate(period.dateStart)} - ${fmtDate(addYears(period.dateStart, 1))}`}
            />
          }
          action={
            <div className="flex gap-4">
              <IconStat icon={Wallet} value={fmtMoney(yearIncome)} label="Income" tone="brand" />
              <IconStat icon={ShoppingCart} value={yearSales} label="Sales" tone="info" />
              <IconStat icon={Users} value={yearCustomers} label="Customers" tone="success" />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={analyticsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="60%" stopColor="var(--color-chart-1)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="salesLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-chart-2)" />
                  <stop offset="100%" stopColor="var(--color-chart-3)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
              <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="income"
                stroke="var(--color-text-faint)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={fmtAxisMoney}
              />
              <YAxis
                yAxisId="counts"
                orientation="right"
                stroke="var(--color-text-faint)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={36}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-brand)', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={<ChartTooltip formatter={(v: number, name: string) => (name === 'Income' ? fmtMoney(v) : v)} />}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Area
                yAxisId="income"
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#incomeGradient)"
                isAnimationActive
                animationDuration={800}
              />
              <Line yAxisId="counts" type="monotone" dataKey="sales" name="Sales" stroke="url(#salesLineGradient)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-chart-2)' }} activeDot={{ r: 5 }} isAnimationActive animationDuration={800} />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="customers"
                name="Customers"
                stroke="var(--color-chart-4)"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Sales by Country / Currency */}
        <GlassCard
          className="xl:col-span-3 flex flex-col h-full"
          header={<CardHeader icon={Globe} title="Sales by Country" tone="info" />}
        >
          <div className="-mx-5 -mt-1 mb-1 overflow-hidden rounded-t-xl bg-[linear-gradient(180deg,var(--color-surface-hover)_0%,transparent_100%)] px-5 pt-2 pb-1">
            <WorldMapDecoration />
          </div>
          <div className="mt-4 flex-1 flex flex-wrap items-center justify-center gap-5">
            {salesByCurrency.length === 0 && <p className="text-xs text-text-faint">No sales yet.</p>}
            {salesByCurrency.map((row, i) => {
              const pct = currencyMax > 0 ? Math.max((Number(row.total) / currencyMax) * 100, 4) : 0
              return (
                <div key={row.currency} className="flex flex-col items-center gap-1.5">
                  <RadialGauge percent={pct} size={i === 0 ? 92 : 64} strokeWidth={i === 0 ? 8 : 6} color={DONUT_COLORS[i % DONUT_COLORS.length]}>
                    <span className={`font-bold text-text leading-none ${i === 0 ? 'text-base' : 'text-sm'}`}>{row.currency}</span>
                  </RadialGauge>
                  <span className="text-xs text-text-faint tabular-nums">{fmtNumber(row.total)}</span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>

      {/* ── Row 3: Recent sales table + Bank details ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Recent sales table */}
        <GlassCard
          className="xl:col-span-8 flex flex-col h-full"
          header={<CardHeader icon={Receipt} title="Last 7 Sales" tone="brand" />}
          action={<Link to={ROUTES.reports} className="text-sm text-brand hover:underline font-medium">View All</Link>}
        >
          {recentSales.length === 0 ? (
            <div className="flex-1 min-h-40 flex flex-col items-center justify-center gap-2 text-center">
              <span className="w-12 h-12 rounded-full grid place-items-center bg-surface-alt text-text-faint">
                <Receipt size={20} />
              </span>
              <p className="text-xs text-text-faint">No sales yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1 -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium pb-2 px-2">Ref.</th>
                    <th className="font-medium pb-2 px-2">Invoice Date</th>
                    <th className="font-medium pb-2 px-2">Third-Party</th>
                    <th className="font-medium pb-2 px-2 text-right">Amount (Inc. Tax)</th>
                    <th className="font-medium pb-2 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => {
                    const status = STATUS_STYLES[sale.fk_statut] ?? STATUS_STYLES[0]
                    return (
                      <tr key={sale.id} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                        <td className="py-2.5 px-2">
                          <span className="flex items-center gap-1.5 text-brand font-medium">
                            <FileText size={13} />
                            {sale.ref || '(draft)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-text-muted whitespace-nowrap">{fmtInvoiceDate(sale.datef)}</td>
                        <td className="py-2.5 px-2 text-brand">{sale.company_name}</td>
                        <td className="py-2.5 px-2 text-text text-right tabular-nums font-medium">{fmtNumber(sale.total_ttc)}</td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                            <status.icon size={11} />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Bank details */}
        <GlassCard
          className="xl:col-span-4 flex flex-col h-full"
          header={<CardHeader icon={Landmark} title="Bank Details" tone="success" />}
        >
          <div className="flex-1 overflow-y-auto soft-scrollbar pr-1 space-y-2.5">
            {banks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <span className="w-10 h-10 rounded-full grid place-items-center bg-surface-alt text-text-faint">
                  <Landmark size={18} />
                </span>
                <p className="text-xs text-text-faint">No bank accounts yet.</p>
              </div>
            )}
            {banks.map((b) => {
              const balance = Number(b.balance)
              const up = balance >= 0
              const Icon = up ? TrendingUp : TrendingDown
              const pct = bankBalanceMax > 0 ? (Math.abs(balance) / bankBalanceMax) * 100 : 0
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-alt transition-colors">
                  <RadialGauge percent={pct} size={40} strokeWidth={4} color={up ? 'var(--color-success)' : 'var(--color-danger)'}>
                    <Landmark size={14} className="text-text-faint" />
                  </RadialGauge>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1 text-sm text-text truncate font-medium">
                      {b.label}
                      <span className={`inline-flex items-center gap-0.5 text-xs shrink-0 ${up ? 'text-success' : 'text-danger'}`}>
                        <Icon size={12} />
                      </span>
                    </span>
                    <p className="text-xs text-text-faint truncate tabular-nums">{fmtMoney(balance)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
