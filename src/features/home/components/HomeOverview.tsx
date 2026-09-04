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
  CalendarDays,
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

// ISO 3166-1 alpha-2 -> flag emoji via Unicode Regional Indicator Symbols
// (a deterministic conversion, not a lookup table — works for any real
// code the backend returns). Real customer records carry a real
// country_code (see toThirdPartyRow in customers.queries.ts); returns ''
// when a country has none on file so the row just skips the flag rather
// than showing a broken/placeholder glyph.
function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  const base = 0x1f1e6
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65))
}

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

const TONE_COLOR: Record<StatTone, string> = {
  brand: 'var(--color-brand)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  danger: 'var(--color-danger)',
}

// Real day-over-day change — null (never a fabricated 0%/∞%) when there's
// no real amount to compare against for yesterday.
function pctChange(curr: number, prev: number): { percent: number; up: boolean } | null {
  if (!prev) return null
  return { percent: ((curr - prev) / Math.abs(prev)) * 100, up: curr >= prev }
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

// One of the hero's 3 "Today" tiles — icon + amount + a real share-of-today
// gauge, with a real vs-Yesterday badge when there's a real yesterday
// figure to compare against (`trend` is null otherwise, e.g. Purchases has
// no backing endpoint at all — see home.queries.ts). `invertSentiment` flips
// the badge's up/down coloring for metrics where "more" is bad news (a
// bigger refund total isn't a good trend, even though the number went up).
function TodayTile({
  icon: Icon,
  label,
  value,
  gaugePct,
  tone,
  trend,
  invertSentiment = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  gaugePct: number
  tone: StatTone
  trend: { percent: number; up: boolean } | null
  invertSentiment?: boolean
}) {
  const badgeUp = trend ? (invertSentiment ? !trend.up : trend.up) : true
  return (
    <div className="min-w-0 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${TONE_CLS[tone]}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-text-muted text-xs font-medium leading-tight">{label}</p>
          <p className="text-lg font-bold text-hero-heading truncate leading-tight mt-0.5">{value}</p>
        </div>
        <RadialGauge percent={gaugePct} size={40} strokeWidth={4} color={TONE_COLOR[tone]} />
      </div>
      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 text-xs flex items-center gap-1.5">
        {trend ? (
          <>
            <ChangeBadge percent={trend.percent} up={badgeUp} />
            <span className="text-text-faint">vs Yesterday</span>
          </>
        ) : (
          <span className="text-text-faint">No data for yesterday</span>
        )}
      </div>
    </div>
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

  const { today, zra, banks, customers, customersByCountry, salesBreakdown, purchaseBreakdown, monthly, months, period, legacyCounts, recentSales } = summary

  const todayTotal = today.invoices_count + today.purchases_count
  const salesSharePct = todayTotal > 0 ? (today.invoices_count / todayTotal) * 100 : 50
  const purchaseSharePct = todayTotal > 0 ? (today.purchases_count / todayTotal) * 100 : 50
  // Real ratio (refund vs. today's own sales) — not a fabricated decorative
  // number, same convention as every other RadialGauge on this page.
  const refundSharePct = today.sales_amount > 0 ? Math.min((today.refund_amount / today.sales_amount) * 100, 100) : 0
  const salesTrend = pctChange(today.sales_amount, today.sales_amount_yesterday)
  const refundTrend = pctChange(today.refund_amount, today.refund_amount_yesterday)
  const purchaseTrend = pctChange(today.purchases_amount, today.purchases_amount_yesterday)
  const todayLabel = fmtDate(new Date().toISOString().slice(0, 10))

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

  const bankBalanceMax = Math.max(...banks.map((b) => Math.abs(Number(b.balance))), 0)
  const topCountry = customersByCountry[0] ?? null
  const countryMax = topCountry?.count ?? 0

  return (
    <div className="space-y-4">
      {/* ── Row 1: Hero — today's snapshot, full width ───────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-[linear-gradient(135deg,var(--color-hero-from)_0%,var(--color-hero-via)_55%,var(--color-surface)_100%)] border border-border shadow-sm">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getGreetingEmoji()}</span>
              <h2 className="text-xl font-bold text-hero-heading">
                {getGreeting()}, {username}!
              </h2>
            </div>
            <p className="text-text-muted text-sm">Here&apos;s what&apos;s happening with your store today</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-hero-heading backdrop-blur-sm">
            <CalendarDays size={13} />
            {todayLabel}
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TodayTile icon={ShoppingCart} label="Sales Today" value={fmtMoney(today.sales_amount)} gaugePct={salesSharePct} tone="brand" trend={salesTrend} />
          <TodayTile icon={Package} label="Purchase Today" value={fmtMoney(today.purchases_amount)} gaugePct={purchaseSharePct} tone="info" trend={purchaseTrend} />
          <TodayTile icon={RotateCcw} label="Today's Refund" value={fmtMoney(today.refund_amount)} gaugePct={refundSharePct} tone="warning" trend={refundTrend} invertSentiment />
        </div>
      </div>

      {/* ── Row 1.5: Headline KPIs — most important first (Revenue leads,
          matching a Power BI executive summary). Each metric appears here
          ONCE; the snapshot strip and breakdown card below cover different,
          non-overlapping metrics. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={Number(salesBreakdown.total_amount)}
          format={(n) => fmtMoney(n)}
          sublabel={`${fmtMoney(salesBreakdown.paid_amount)} paid`}
          tone="success"
        />
        <StatCard
          icon={Receipt}
          label="Total Invoices"
          value={salesBreakdown.draft_count + salesBreakdown.validated_count}
          format={fmtCount}
          sublabel={`${salesBreakdown.validated_count} validated`}
          tone="brand"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={customers.total}
          format={fmtCount}
          sublabel={`${customers.prospects} prospects`}
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

      {/* ── Row 1.75: ZRA & Orders snapshot ──────────────────────────────
          Secondary KPIs not already covered by the headline row above (ZRA
          Signed lives there) — each metric still appears exactly once on
          the page. Trend/"Last Year" fields exist on these stats
          (StatWithTrend) but are always 0 — no year-over-year comparison
          endpoint on this backend — so only the real current value is
          shown per stat, honestly, rather than a fabricated Last Year/%
          badge. */}
      <GlassCard header={<CardHeader icon={BadgeCheck} title="ZRA & Orders Snapshot" tone="success" />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <IconStat icon={Wallet} value={fmtMoney(zra.totalSale.value)} label="ZRA Total Sale" tone="brand" />
          <IconStat icon={Receipt} value={fmtMoney(zra.totalTax.value)} label="ZRA Sale Tax" tone="warning" />
          <IconStat icon={ClipboardList} value={fmtCount(legacyCounts.salesOrders.value)} label="Sales Orders" tone="info" />
          <IconStat icon={FileSignature} value={fmtCount(legacyCounts.contracts.value)} label="Contract" tone="brand" />
          <IconStat icon={Package} value={fmtCount(legacyCounts.shipments.value)} label="Shipment" tone="success" />
        </div>
      </GlassCard>

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

            {/* Sales Orders / Contracts already appear once in the ZRA &
                Orders Snapshot strip above — only Quotations is unique to
                this card, so it's the only one repeated here. */}
            {tab === 'Sales' && (
              <div className="pt-4 border-t border-border">
                <IconStat icon={FileText} value={legacyCounts.quotationsCount} label="Quotations" tone="info" />
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
          className="xl:col-span-9"
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

      </div>

      {/* ── Row 3: Recent sales table + Bank details + Customers by Country ─
          Three cards, one row — Customers by Country moved in here (from
          its own former full-width row) and dropped its decorative map,
          since a ~4/12 column has no good room for one; the real data
          (stats + ranked list) fits the same compact pattern Bank Details
          already uses. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Recent sales table — fixed height + internal scroll, matching
            the other two cards alongside it, so this row's height never
            depends on any one card's row/account/country count (a wide
            table still scrolls horizontally inside the same box). */}
        <GlassCard
          className="xl:col-span-5 flex flex-col h-[360px]"
          header={<CardHeader icon={Receipt} title="Last 7 Sales" tone="brand" />}
          action={<Link to={ROUTES.reports} className="text-sm text-brand hover:underline font-medium">View All</Link>}
        >
          {recentSales.length === 0 ? (
            <div className="h-full min-h-40 flex flex-col items-center justify-center gap-2 text-center">
              <span className="w-12 h-12 rounded-full grid place-items-center bg-surface-alt text-text-faint">
                <Receipt size={20} />
              </span>
              <p className="text-xs text-text-faint">No sales yet.</p>
            </div>
          ) : (
            <div className="max-h-[270px] overflow-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
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

        {/* Bank details — capped height + internal scroll: `overflow-y-auto`
            alone did nothing here before (GlassCard's own content wrapper
            isn't a flex container, so `flex-1` on this div never actually
            bounded its height — it just grew with the account list). A
            real max-height makes accounts beyond it scroll instead of
            pushing the whole row taller. */}
        <GlassCard
          className="xl:col-span-3 flex flex-col h-[360px]"
          header={<CardHeader icon={Landmark} title="Bank Details" tone="success" />}
        >
          <div className="max-h-[270px] overflow-y-auto soft-scrollbar pr-1 space-y-2.5">
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

        {/* Customers by Country — real per-country counts, from each
            customer's own `country` field (see home.queries.ts). Not
            sales-by-country: no invoice on this backend carries a country
            or a customer id to join against, so a real revenue-per-country
            figure isn't derivable — Total Sales/Purchases below are real
            business-wide totals (same source as the KPI row up top), not a
            per-country split. */}
        <GlassCard className="xl:col-span-4 flex flex-col h-[360px]" header={<CardHeader icon={Globe} title="Customers by Country" tone="info" />}>
          <div className="grid grid-cols-2 gap-2.5 pb-3 border-b border-border">
            <IconStat icon={Users} value={fmtCount(customers.total)} label="Customers" tone="brand" />
            <IconStat icon={Wallet} value={fmtMoney(salesBreakdown.total_amount)} label="Total Sales" tone="success" />
            <IconStat icon={ShoppingCart} value={fmtMoney(purchaseBreakdown.total_amount)} label="Total Purchases" tone="warning" />
            {topCountry && (
              <IconStat
                icon={Globe}
                value={fmtCount(topCountry.count)}
                label={topCountry.code ? `${flagEmoji(topCountry.code)} ${topCountry.country}` : topCountry.country}
                tone="info"
              />
            )}
          </div>

          {customersByCountry.length === 0 ? (
            <p className="flex-1 flex items-center justify-center text-xs text-text-faint text-center">No country data yet.</p>
          ) : (
            <div className="max-h-[130px] overflow-y-auto soft-scrollbar pr-1 mt-3 space-y-2">
              {customersByCountry.map((row) => {
                const pct = countryMax > 0 ? (row.count / countryMax) * 100 : 0
                return (
                  <div key={row.country} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 flex items-center gap-1 text-text">
                      {row.code && (
                        <span className="leading-none" aria-hidden="true">
                          {flagEmoji(row.code)}
                        </span>
                      )}
                      <span className="truncate">{row.country}</span>
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                    <span className="w-5 shrink-0 text-text-muted tabular-nums text-right">{row.count}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2.5">
            <IconStat icon={Globe} value={fmtCount(customersByCountry.length)} label="Countries" tone="info" />
            <IconStat icon={Users} value={`${fmtCount(customers.local)} / ${fmtCount(customers.abroad)}`} label="Local / Abroad" tone="success" />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
