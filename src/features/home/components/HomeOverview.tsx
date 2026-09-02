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
} from 'recharts'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { WorldMapDecoration } from './WorldMapDecoration'
import { RadialGauge } from './RadialGauge'
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

// Compact axis-tick label, e.g. 4000000 -> "4M", 8500 -> "8.5K" — the full
// 2-decimal fmtMoney is for tooltips/totals, not cramped Y-axis ticks.
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

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface-alt border border-border rounded-xl p-4 ${className}`}>{children}</div>
}

const TONE_CLS = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-info-bg text-info-fg',
} as const

function IconStat({
  icon: Icon,
  value,
  label,
  tone = 'brand',
}: {
  icon: LucideIcon
  value: ReactNode
  label: string
  tone?: keyof typeof TONE_CLS
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

function ShopIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="absolute top-3 right-3 w-16 h-14 @sm:w-20 @sm:h-16 @lg:w-24 @lg:h-20" aria-hidden="true">
      <g>
        <path d="M20 55 L80 30 L140 55 L140 65 L20 65 Z" fill="var(--color-illust-1)" />
        <path d="M20 55 L45 45 L45 65 L20 65 Z" fill="var(--color-illust-2)" />
        <path d="M45 45 L70 37 L70 65 L45 65 Z" fill="var(--color-illust-1)" />
        <path d="M70 37 L95 37 L95 65 L70 65 Z" fill="var(--color-illust-2)" />
        <path d="M95 37 L115 45 L115 65 L95 65 Z" fill="var(--color-illust-1)" />
        <path d="M115 45 L140 55 L140 65 L115 65 Z" fill="var(--color-illust-2)" />
        <rect x="30" y="65" width="100" height="55" rx="2" fill="var(--color-illust-3)" stroke="var(--color-illust-1)" />
        <rect x="42" y="75" width="22" height="22" rx="2" fill="var(--color-illust-4)" stroke="var(--color-illust-2)" />
        <rect x="96" y="75" width="22" height="22" rx="2" fill="var(--color-illust-4)" stroke="var(--color-illust-2)" />
        <rect x="70" y="88" width="20" height="32" rx="1" fill="var(--color-illust-5)" />
        <circle cx="86" cy="104" r="1.6" fill="var(--color-illust-6)" />
      </g>
    </svg>
  )
}

function ConfettiDots() {
  const dots = [
    { top: 10, left: '55%', size: 6, color: 'var(--color-chart-3)' },
    { top: 28, left: '62%', size: 4, color: 'var(--color-chart-5)' },
    { top: 6, left: '70%', size: 5, color: 'var(--color-chart-6)' },
    { top: 34, left: '78%', size: 6, color: 'var(--color-chart-3)' },
    { top: 14, left: '86%', size: 4, color: 'var(--color-chart-7)' },
    { top: 40, left: '92%', size: 5, color: 'var(--color-chart-5)' },
  ]
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {dots.map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{ top: d.top, left: d.left, width: d.size, height: d.size, background: d.color }} />
      ))}
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
  if (hour < 12) return '🌅 Good Morning'
  if (hour < 17) return '☀️ Good Afternoon'
  if (hour < 21) return '🌇 Good Evening'
  return '🌙 Good Night'
}

// summary comes from useDashboardSummary (stubbed — see home.queries.ts).
// "Sales Orders" / "Contract" / "Shipment" / "Total Quotations" mirror real
// counts from llx_commande / llx_contrat / llx_expedition / llx_propal in the
// live Dolibarr DB — legacy modules that exist there even though nothing in
// this app manages them yet. The "vs Last Year" badges reproduce the
// reference dashboard's own display quirk: with no prior-year baseline, it
// re-shows the raw value as the "%" rather than hiding the badge.
export function HomeOverview({ username, summary }: { username: string; summary: DashboardSummary }) {
  const [tab, setTab] = useState<'Sales' | 'Purchase'>('Sales')

  const { today, zra, banks, salesBreakdown, purchaseBreakdown, monthly, months, period, legacyCounts, recentSales, salesByCurrency } = summary

  // Real derived share, not an invented number: how today's activity splits
  // between sales and purchases. Falls back to an even split when there's
  // no activity yet, so the rings don't render a stray full/empty arc.
  const todayTotal = today.invoices_count + today.purchases_count
  const salesSharePct = todayTotal > 0 ? (today.invoices_count / todayTotal) * 100 : 50
  const purchaseSharePct = todayTotal > 0 ? (today.purchases_count / todayTotal) * 100 : 50

  const zraStats = [
    { label: 'ZRA Signed Invoices', stat: zra.signedInvoices, fmt: fmtCount },
    { label: 'ZRA Total Sale', stat: zra.totalSale, fmt: fmtMoney },
    { label: 'ZRA Sale Tax', stat: zra.totalTax, fmt: fmtMoney },
    { label: 'Sales Orders', stat: legacyCounts.salesOrders, fmt: fmtCount },
    { label: 'Contract', stat: legacyCounts.contracts, fmt: fmtCount },
    { label: 'Shipment', stat: legacyCounts.shipments, fmt: fmtCount },
  ]

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
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="@container xl:col-span-5 relative overflow-hidden rounded-xl p-4 bg-[linear-gradient(135deg,var(--color-hero-from)_0%,var(--color-hero-via)_55%,var(--color-surface)_100%)]">
          <ConfettiDots />
          <ShopIllustration />
          <div className="relative z-10">
            <div className="pr-20 @sm:pr-24">
              <h2 className="text-xl font-bold text-hero-heading">
                {getGreeting()}, {username}!
              </h2>
              <p className="text-text-muted text-sm mt-1">Here&apos;s what&apos;s happening with your store today</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {(
                [
                  ['Sales Today', today.invoices_count, today.sales_amount, salesSharePct, 'var(--color-chart-1)'],
                  ['Purchase Today', today.purchases_count, today.purchases_amount, purchaseSharePct, 'var(--color-chart-2)'],
                ] as const
              ).map(([label, count, amount, pct, color]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-lg bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 py-3 flex items-center gap-3"
                >
                  <RadialGauge percent={pct} size={64} strokeWidth={6} color={color}>
                    <span className="text-base font-bold text-hero-heading leading-none">{count}</span>
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

        <Card className="xl:col-span-4 @container">
          <div className="grid grid-cols-3 divide-x divide-y divide-border [&>*:nth-child(-n+3)]:pb-3 [&>*:nth-child(n+4)]:pt-3">
            {zraStats.map((s, i) => (
              <div key={s.label} className={`min-w-0 ${i % 3 === 0 ? 'pr-3' : 'px-3'}`}>
                <p className="text-xs text-text-muted truncate">{s.label}</p>
                <p className="font-semibold text-text! truncate">{s.fmt(s.stat.value)}</p>
                <p className="text-[11px] text-text-faint mt-1">Last Year</p>
                <div className="flex items-center gap-1 text-[11px] min-w-0">
                  <span className="text-text-faint truncate">{s.fmt(s.stat.lastYear)}</span>
                  <ChangeBadge percent={s.stat.percent} up={s.stat.up} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <h3 className="font-semibold mb-2 text-text!">Bank Details</h3>
          <div className="h-37 overflow-y-auto soft-scrollbar pr-2 space-y-2">
            {banks.length === 0 && <p className="text-xs text-text-faint">No bank accounts yet.</p>}
            {banks.map((b) => {
              const balance = Number(b.balance)
              const up = balance >= 0
              const Icon = up ? TrendingUp : TrendingDown
              const pct = bankBalanceMax > 0 ? (Math.abs(balance) / bankBalanceMax) * 100 : 0
              return (
                <div key={b.id} className="flex items-center gap-3">
                  <RadialGauge percent={pct} size={38} strokeWidth={4} color={up ? 'var(--color-success)' : 'var(--color-danger)'}>
                    <Landmark size={13} className="text-text-faint" />
                  </RadialGauge>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1 text-sm text-text! truncate">
                      {b.label}
                      <span className={`inline-flex items-center gap-0.5 text-xs shrink-0 ${up ? 'text-success' : 'text-danger'}`}>
                        <Icon size={12} />
                      </span>
                    </span>
                    <p className="text-xs text-text-faint truncate">{fmtMoney(balance)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-start-1 xl:col-span-3 xl:row-start-1 xl:row-span-2 flex flex-col h-full @container">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {([
                ['Sales', ShoppingCart],
                ['Purchase', Package],
              ] as const).map(([t, TabIcon]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${tab === t ? 'bg-brand! text-white!' : 'text-text-muted hover:bg-surface-hover'}`}
                >
                  <TabIcon size={13} />
                  {t}
                </button>
              ))}
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-surface-hover text-text-muted">Whole Year</span>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={30} outerRadius={40} paddingAngle={2}>
                      {donutData.map((entry, i) => (
                        <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-text-muted">Total {tab}</p>
                  <p className="text-base font-bold text-text!">{donutTotal}</p>
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
                  // Real credit-note sum (see home.queries.ts's totalRefund)
                  // — only computed from sales-side invoices, so honestly 0
                  // under the Purchase tab (no purchase-invoice endpoint).
                  [RotateCcw, 'Total Refund', fmtMoney(tab === 'Sales' ? summary.totalRefund : 0)],
                ] as const
              ).map(([RowIcon, label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-text-muted">
                    <RowIcon size={13} className="text-text-faint" />
                    {label}
                  </span>
                  <span className="text-text! font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="xl:col-start-4 xl:col-span-6 xl:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
                <BarChart3 size={17} />
              </span>
              <div>
                <h3 className="font-semibold text-text!">Sales Analytics</h3>
                <p className="text-xs text-text-faint">
                  {fmtDate(period.dateStart)} - {fmtDate(addYears(period.dateStart, 1))}
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <IconStat icon={Wallet} value={fmtMoney(yearIncome)} label="Income" tone="brand" />
              <IconStat icon={ShoppingCart} value={yearSales} label="Sales" tone="info" />
              <IconStat icon={Users} value={yearCustomers} label="Customers" tone="success" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={analyticsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="none" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} />
              <YAxis
                yAxisId="income"
                stroke="var(--color-text-faint)"
                fontSize={11}
                tickLine={false}
                width={48}
                tickFormatter={fmtAxisMoney}
                label={{ value: 'Income', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-faint)' }}
              />
              <YAxis
                yAxisId="counts"
                orientation="right"
                stroke="var(--color-text-faint)"
                fontSize={11}
                tickLine={false}
                width={40}
                allowDecimals={false}
                label={{ value: 'Sales / Customers', angle: 90, position: 'insideRight', fontSize: 11, fill: 'var(--color-text-faint)' }}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{
                  fontSize: 12,
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
                labelStyle={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ padding: '1px 0' }}
                formatter={(value, name) => (name === 'Income' ? fmtMoney(Number(value)) : Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Area
                yAxisId="income"
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#incomeWave)"
                isAnimationActive={false}
              />
              <Line yAxisId="counts" type="monotone" dataKey="sales" name="Sales" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="customers"
                name="Customers"
                stroke="var(--color-chart-4)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card className="xl:col-start-4 xl:col-span-6 xl:row-start-2 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
                <Receipt size={17} />
              </span>
              <h3 className="font-semibold text-text!">Last 7 Sales</h3>
            </div>
            <Link to={ROUTES.reports} className="text-sm text-brand hover:underline">
              View All
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="flex-1 min-h-40 flex flex-col items-center justify-center gap-2 text-center">
              <span className="w-11 h-11 rounded-full grid place-items-center bg-surface-hover text-text-faint">
                <Receipt size={18} />
              </span>
              <p className="text-xs text-text-faint">No sales yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium pb-2">Ref.</th>
                    <th className="font-medium pb-2">Invoice Date</th>
                    <th className="font-medium pb-2">Third-Party</th>
                    <th className="font-medium pb-2 text-right">Amount (Inc. Tax)</th>
                    <th className="font-medium pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => {
                    const status = STATUS_STYLES[sale.fk_statut] ?? STATUS_STYLES[0]
                    return (
                      <tr key={sale.id} className="border-t border-border hover:bg-surface-hover">
                        <td className="py-1.5 pr-2">
                          <span className="flex items-center gap-1.5 text-brand">
                            <FileText size={13} />
                            {sale.ref || '(draft)'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-2 text-text-muted whitespace-nowrap">{fmtInvoiceDate(sale.datef)}</td>
                        <td className="py-1.5 pr-2 text-brand">{sale.company_name}</td>
                        <td className="py-1.5 pr-2 text-text! text-right tabular-nums">{fmtNumber(sale.total_ttc)}</td>
                        <td className="py-1.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>
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
        </Card>

        <Card className="xl:col-start-10 xl:col-span-3 xl:row-start-1 xl:row-span-2 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-info-bg text-info-fg">
              <Globe size={17} />
            </span>
            <h3 className="font-semibold text-text!">Sales by Country</h3>
          </div>
          <div className="-mx-4 -mt-1 mb-1 overflow-hidden rounded-t-xl bg-[linear-gradient(180deg,var(--color-surface-hover)_0%,transparent_100%)] px-4 pt-2 pb-1">
            <WorldMapDecoration />
          </div>
          <div className="mt-4 flex-1 flex flex-wrap items-center justify-center gap-5">
            {salesByCurrency.length === 0 && <p className="text-xs text-text-faint">No sales yet.</p>}
            {salesByCurrency.map((row, i) => {
              const pct = currencyMax > 0 ? Math.max((Number(row.total) / currencyMax) * 100, 4) : 0
              return (
                <div key={row.currency} className="flex flex-col items-center gap-1.5">
                  <RadialGauge percent={pct} size={i === 0 ? 92 : 64} strokeWidth={i === 0 ? 8 : 6} color={DONUT_COLORS[i % DONUT_COLORS.length]}>
                    <span className={`font-bold text-text! leading-none ${i === 0 ? 'text-base' : 'text-sm'}`}>{row.currency}</span>
                  </RadialGauge>
                  <span className="text-xs text-text-faint tabular-nums">{fmtNumber(row.total)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
