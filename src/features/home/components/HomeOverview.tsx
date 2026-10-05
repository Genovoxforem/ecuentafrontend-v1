import {
  Landmark,
  TrendingUp,
  TrendingDown,
  FileText,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  Boxes,
  BarChart3,
  Users,
  Globe,
  Receipt,
  CalendarDays,
  AlertTriangle,
  Zap,
  ChevronRight,
  UserPlus,
  RefreshCw,
  FilePlus,
  PackagePlus,
  Eye,
  ShieldCheck,
  Banknote,
  CheckCircle2,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, ComposedChart, Bar, Area, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../../context/ThemeContext'
import { ROUTES } from '../../../routes'
import { formatMoney, formatNumber } from '../../../utils/format'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import { resolveBackendAsset } from '../../../api/backends'
import { GlassCard, CardHeader, type StatTone } from './DashboardCards'
import { WorldMapDecoration } from './WorldMapDecoration'
import type { HomeDashboard } from '../home.queries'
import type { DashInvoiceRow, DashKpi, DashPeriod, DashSide, DashTrend } from '../mainDashboardParser'

// The home dashboard — the classic home page's widgets (mainDashboard/index.php),
// in the same order: today's KPI cards, then the Sales/Purchase tab driving the
// donut, analytics, last-7 table and by-country card, and the right-hand stack
// of bank balances, attention items and quick actions. Every figure comes from
// `dashboard` (see home.queries.ts); every link goes to the React page for the
// same screen, never to a backend page.

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

// The classic donut's colours: theme colour, light blue, grey, amber.
const DONUT_COLORS: Record<string, string> = {
  completed: 'var(--color-chart-1)',
  started: 'var(--color-chart-3)',
  draft: 'var(--color-text-faint)',
  refund: 'var(--color-chart-5)',
}

const PERIODS: Array<{ key: DashPeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
]

const SIDE_TEXT = {
  sales: {
    tab: 'Sales',
    analytics: 'Sales Analytics',
    last7: 'Last 7 Sales',
    party: 'Customer',
    countries: 'Sales by Country',
    donutCenter: 'Total Sales',
    series: ['Income', 'Sales', 'Sales Order', 'Customers'],
    empty: ['No sales yet', 'Recent sales invoices will appear here.'],
    list: ROUTES.invoiceList,
  },
  purchase: {
    tab: 'Purchase',
    analytics: 'Purchase Analytics',
    last7: 'Last 7 Purchases',
    party: 'Supplier',
    countries: 'Purchase by Country',
    donutCenter: 'Total Purchases',
    series: ['Expenses', 'Purchases', 'Purchase Order', 'Vendors'],
    empty: ['No purchases yet', 'Recent purchase invoices will appear here.'],
    list: ROUTES.vendorInvoiceList,
  },
} as const

const money = (n: number, currency: string) => `${formatMoney(n)} ${currency}`.trim()

function fmtAxisMoney(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
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

// "Mon, 05 Oct 2026" and "06:48 AM", as the classic greeting prints them; the time ticks every 30 s like there.
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/^(\w+) /, '$1, ')
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

function TrendBadge({ trend }: { trend: DashTrend }) {
  const Icon = trend.up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${trend.up ? 'text-success' : 'text-danger'}`}>
      <Icon size={11} />
      {trend.percent.toFixed(1)}%
    </span>
  )
}

// The classic KPI card's mini bar chart (bar heights as the page draws them).
function Sparkline({ values, color }: { values: number[]; color: string }) {
  return (
    <span className="flex h-9 shrink-0 items-end gap-[2px]" aria-hidden="true">
      {values.map((v, i) => (
        <i key={i} className="block w-[3px] rounded-sm" style={{ height: `${Math.max(8, Math.min(100, v))}%`, background: color, opacity: 0.35 + (v / 100) * 0.65 }} />
      ))}
    </span>
  )
}

function KpiTile({ kpi, label, icon: Icon, tone }: { kpi: DashKpi | undefined; label: string; icon: LucideIcon; tone: StatTone }) {
  const value = kpi?.value ?? null
  const display = value === null ? '—' : kpi?.currency ? money(value, kpi.currency) : formatNumber(value)
  return (
    <div className="min-w-0 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${TONE_CLS[tone]}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-text-muted text-xs font-medium leading-tight truncate">{kpi?.label || label}</p>
          <p className="text-lg font-bold text-hero-heading truncate leading-tight mt-0.5">{display}</p>
        </div>
        {kpi && kpi.spark.length > 0 && <Sparkline values={kpi.spark} color={TONE_COLOR[tone]} />}
      </div>
      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 text-xs flex items-center gap-1.5 min-w-0">
        {kpi?.trend && <TrendBadge trend={kpi.trend} />}
        <span className="text-text-faint truncate">{kpi ? kpi.meta : 'Not available'}</span>
      </div>
    </div>
  )
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
      View All <ChevronRight size={14} />
    </Link>
  )
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
      <span className="w-11 h-11 rounded-full grid place-items-center bg-surface-alt text-text-faint">
        <Icon size={19} />
      </span>
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="text-xs text-text-faint">{text}</p>
    </div>
  )
}

// Badge colour of a classic invoice status (badge-statusN): 0 draft, 1 not paid,
// 3 started (partly paid), 4 validated, 6 paid, 8/9 abandoned.
function statusTone(code: number | null): string {
  if (code === 6) return 'bg-success-bg text-success-fg'
  if (code === 1) return 'bg-warning-bg text-warning-fg'
  if (code === 3 || code === 4) return 'bg-info-bg text-info-fg'
  if (code === 8 || code === 9) return 'bg-danger-bg text-danger-fg'
  return 'bg-neutral-bg text-neutral-fg'
}

// Premium tooltip for recharts — glass surface with brand accent border.
function ChartTooltip({ active, payload, label, formatter }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string; fill?: string }>; label?: string; formatter?: (value: number, name: string) => ReactNode }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-xl shadow-black/10">
      <p className="text-xs font-semibold text-text mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color || entry.fill }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="font-semibold text-text tabular-nums">{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function DonutCard({ side, tab, onTab }: { side: DashSide; tab: 'sales' | 'purchase'; onTab: (t: 'sales' | 'purchase') => void }) {
  const slices = side.donut.map((s) => ({ ...s, value: s.count ?? s.percent }))
  // The centre total leaves out Refund, as the classic chart does.
  const total = side.donut.filter((s) => s.label.toLowerCase() !== 'refund').reduce((sum, s) => sum + (s.count ?? 0), 0)
  const hasData = slices.some((s) => s.value > 0)
  return (
    <GlassCard
      className="lg:col-span-5 flex flex-col"
      header={
        <div className="flex items-center gap-2" role="tablist">
          {(['sales', 'purchase'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-text-muted hover:bg-surface-alt'}`}
            >
              {t === 'sales' ? <ShoppingCart size={13} /> : <ShoppingBag size={13} />}
              {SIDE_TEXT[t].tab}
            </button>
          ))}
        </div>
      }
      action={<span className="text-xs px-2.5 py-1 rounded-full bg-surface-alt text-text-muted">Whole Year</span>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="w-36 h-36 relative shrink-0 mx-auto sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={hasData ? slices : [{ label: 'none', value: 1 }]} dataKey="value" nameKey="label" innerRadius={50} outerRadius={68} paddingAngle={hasData ? 2 : 0} stroke="none" isAnimationActive>
                  {(hasData ? slices : [{ label: 'none', value: 1 }]).map((s) => (
                    <Cell key={s.label} fill={hasData ? (DONUT_COLORS[s.label.toLowerCase()] ?? 'var(--color-chart-2)') : 'var(--color-surface-hover)'} />
                  ))}
                </Pie>
                {hasData && <Tooltip content={<ChartTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[11px] text-text-muted">{SIDE_TEXT[tab].donutCenter}</p>
              <p className="text-xl font-bold text-text tabular-nums">{formatNumber(total)}</p>
            </div>
          </div>
          <ul className="flex-1 min-w-[150px] space-y-2">
            {side.donut.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[s.label.toLowerCase()] ?? 'var(--color-chart-2)' }} />
                <span className="text-text-muted flex-1">{s.label}</span>
                {s.count !== null && <span className="text-text font-medium tabular-nums">{formatNumber(s.count)}</span>}
                <span className="w-10 text-right text-text-faint tabular-nums">{s.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
        {side.tiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            {side.tiles.map((tile) => (
              <div key={tile.label} className="rounded-xl bg-surface-alt/60 px-2 py-2.5 text-center">
                <p className="text-lg font-bold text-text tabular-nums leading-tight">{formatNumber(tile.value)}</p>
                <p className="text-[11px] text-text-muted truncate">{tile.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

const SUMMARY_ICONS: LucideIcon[] = [Banknote, ShoppingCart, Users]
const SUMMARY_TONES: StatTone[] = ['brand', 'info', 'success']

function AnalyticsCard({ side, tab }: { side: DashSide; tab: 'sales' | 'purchase' }) {
  const available = PERIODS.filter((p) => side.periods[p.key])
  const [period, setPeriod] = useState<DashPeriod>('year')
  const active = side.periods[period] ? period : (available.at(-1)?.key ?? 'year')
  const series = side.periods[active]
  const names = SIDE_TEXT[tab].series
  const data = (series?.labels ?? []).map((label, i) => ({
    label,
    income: series?.income[i] ?? 0,
    sales: series?.sales[i] ?? 0,
    orders: series?.orders[i] ?? 0,
    customers: series?.customers[i] ?? 0,
  }))
  const currency = side.summary.find((s) => s.currency)?.currency || 'ZMW'
  return (
    <GlassCard
      className="lg:col-span-7"
      header={<CardHeader icon={BarChart3} title={SIDE_TEXT[tab].analytics} />}
      action={
        <div className="flex flex-wrap justify-end gap-1" role="tablist">
          {available.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={active === p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${active === p.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-alt'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-3">
        {side.summary.map((item, i) => {
          const Icon = SUMMARY_ICONS[i] ?? Users
          return (
            <div key={item.label} className="flex items-center gap-2.5 min-w-0">
              <span className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${TONE_CLS[SUMMARY_TONES[i] ?? 'brand']}`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold text-text! leading-tight truncate">
                  {item.value === null ? '—' : item.currency ? money(item.value, item.currency) : formatNumber(item.value)}
                </p>
                <p className="text-[11px] text-text-muted leading-tight flex items-center gap-1.5">
                  {item.label}
                  {item.trend && <TrendBadge trend={item.trend} />}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
          <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis yAxisId="amount" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} width={48} tickFormatter={fmtAxisMoney} />
          <YAxis yAxisId="count" orientation="right" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-hover)', opacity: 0.4 }}
            content={<ChartTooltip formatter={(v: number, name: string) => (name === names[0] ? money(v, currency) : formatNumber(v))} />}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          <Bar yAxisId="amount" dataKey="income" name={names[0]} fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar yAxisId="count" dataKey="sales" name={names[1]} fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Area yAxisId="count" type="monotone" dataKey="orders" name={names[2]} stroke="var(--color-text-faint)" fill="var(--color-text-faint)" fillOpacity={0.2} strokeWidth={1} />
          <Line yAxisId="count" type="monotone" dataKey="customers" name={names[3]} stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </GlassCard>
  )
}

function Last7Card({ rows, tab, currency }: { rows: DashInvoiceRow[]; tab: 'sales' | 'purchase'; currency: string }) {
  const text = SIDE_TEXT[tab]
  return (
    <GlassCard className="lg:col-span-7" header={<CardHeader icon={Receipt} title={text.last7} />} action={<ViewAll to={text.list} />}>
      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title={text.empty[0]} text={text.empty[1]} />
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-2">#</th>
                <th className="font-medium py-2 px-2">Invoice No</th>
                <th className="font-medium py-2 px-2">{text.party}</th>
                <th className="font-medium py-2 px-2 text-right">Amount</th>
                <th className="font-medium py-2 px-2">Date</th>
                <th className="font-medium py-2 px-2">Status</th>
                <th className="font-medium py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const to = resolveLegacyRoute(row.href)
                return (
                  <tr key={`${row.id ?? row.ref}-${i}`} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                    <td className="py-2.5 px-2 text-text-faint tabular-nums">{i + 1}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {to ? (
                        <Link to={to} className="inline-flex items-center gap-1.5 text-brand font-medium hover:underline">
                          <FileText size={13} />
                          {row.ref}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-text font-medium">
                          <FileText size={13} />
                          {row.ref}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 max-w-[180px] truncate">
                      {row.partyId ? (
                        <Link to={ROUTES.customerDetail.replace(':id', String(row.partyId))} className="text-brand hover:underline" title={row.party}>
                          {row.party}
                        </Link>
                      ) : (
                        <span className="text-text">{row.party}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-medium text-text whitespace-nowrap">{row.amount === null ? '—' : money(row.amount, currency)}</td>
                    <td className="py-2.5 px-2 text-text-muted whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 px-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusTone(row.statusCode)}`}>{row.status}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {to && (
                        <Link to={to} title="View" aria-label={`View ${row.ref}`} className="inline-flex p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand transition-colors">
                          <Eye size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}

function CountryCard({ side, tab, currency }: { side: DashSide; tab: 'sales' | 'purchase'; currency: string }) {
  const text = SIDE_TEXT[tab]
  return (
    <GlassCard className="lg:col-span-5" header={<CardHeader icon={Globe} title={text.countries} tone="info" />} action={<ViewAll to={text.list} />}>
      {/* 200px high, like the classic map. */}
      <div className="mb-3">
        <WorldMapDecoration markers={side.markers} lines={side.lines} className="block w-full h-[200px]" />
      </div>
      {side.countries.length === 0 ? (
        <EmptyState icon={Inbox} title="No country data" text="Regional totals will appear here." />
      ) : (
        <div className="space-y-2.5">
          {side.countries.map((c) => (
            <div key={`${c.code}-${c.name}`} className="flex items-center gap-2.5 text-sm">
              <span className="w-6 shrink-0">
                {c.code && (
                  <img
                    src={resolveBackendAsset(`/theme/common/flags/${c.code}.png`)}
                    alt=""
                    className="w-6 h-4 object-cover rounded-[2px]"
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden'
                    }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-[0_1_7rem] truncate font-medium text-text" title={c.name}>
                {c.name}
              </span>
              <div className="flex-1 min-w-6 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, c.percent))}%` }} />
              </div>
              <span className="shrink-0 text-text-muted tabular-nums text-xs">{money(c.amount, currency)}</span>
              <span className="w-9 shrink-0 text-right text-text-faint tabular-nums text-xs">{c.percent}%</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function BankCard({ banks }: { banks: HomeDashboard['banks'] }) {
  return (
    <GlassCard header={<CardHeader icon={Landmark} title="Bank Details" tone="success" />} action={<ViewAll to={ROUTES.bankingAccounts} />}>
      {banks.length === 0 ? (
        <EmptyState icon={Landmark} title="No bank accounts" text="Bank account balances will appear here." />
      ) : (
        <div className="max-h-[340px] overflow-y-auto soft-scrollbar pr-1 -mr-1 space-y-3">
          {banks.map((b, i) => {
            const up = b.amount >= 0
            const name = b.id ? (
              <Link to={ROUTES.bankingAccountDetail.replace(':id', String(b.id))} className="truncate font-medium text-text hover:text-brand hover:underline">
                {b.name}
              </Link>
            ) : (
              <span className="truncate font-medium text-text">{b.name}</span>
            )
            return (
              <div key={b.id ?? `bank-${i}`} className="flex items-center gap-3">
                <span className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${TONE_CLS.success}`}>
                  <Landmark size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    {name}
                    <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs ${up ? 'text-success' : 'text-danger'}`}>
                      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {b.percent}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, Math.max(0, b.percent))}%` }} />
                  </div>
                  <p className={`mt-0.5 text-xs tabular-nums ${up ? 'text-text-muted' : 'text-danger'}`}>{money(b.amount, b.currency)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

const ATTENTION_TONES: Record<string, StatTone> = { warning: 'warning', danger: 'danger', primary: 'brand', info: 'info', success: 'success' }

function attentionIcon(href: string, title: string): LucideIcon {
  if (/zra/i.test(href)) return AlertTriangle
  if (/propal/i.test(href) || /quotation/i.test(title)) return ClipboardList
  if (/stock/i.test(href) || /stock/i.test(title)) return Boxes
  if (/bank/i.test(href)) return Landmark
  return FileText
}

function AttentionCard({ items }: { items: HomeDashboard['attention'] }) {
  return (
    <GlassCard header={<CardHeader icon={AlertTriangle} title="Needs Your Attention" tone="warning" />}>
      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All clear" text="Nothing requires your attention right now." />
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const tone = ATTENTION_TONES[item.variant] ?? 'brand'
            const Icon = attentionIcon(item.href, item.title)
            const to = resolveLegacyRoute(item.href)
            const body = (
              <>
                <span className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${TONE_CLS[tone]}`}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text truncate">{item.title}</span>
                  <span className="block text-xs text-text-faint truncate">{item.sub}</span>
                </span>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${TONE_CLS[tone]}`}>{formatNumber(item.count)}</span>
                {to && <ChevronRight size={16} className="shrink-0 text-text-faint" />}
              </>
            )
            return to ? (
              <Link key={item.title} to={to} className="flex items-center gap-3 rounded-xl p-2.5 -mx-2.5 hover:bg-surface-alt transition-colors">
                {body}
              </Link>
            ) : (
              <div key={item.title} className="flex items-center gap-3 rounded-xl p-2.5 -mx-2.5">
                {body}
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

const QUICK_ACTION_ICONS: Array<[RegExp, LucideIcon, StatTone]> = [
  [/sale/i, FilePlus, 'brand'],
  [/invoice/i, FileText, 'info'],
  [/product/i, PackagePlus, 'warning'],
  [/purchase/i, ShoppingBag, 'info'],
  [/customer/i, UserPlus, 'success'],
  [/zra/i, RefreshCw, 'brand'],
]

function QuickActionsCard({ actions }: { actions: HomeDashboard['quickActions'] }) {
  return (
    <GlassCard header={<CardHeader icon={Zap} title="Quick Actions" tone="brand" />}>
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map((action) => {
          const [, Icon, tone] = QUICK_ACTION_ICONS.find(([re]) => re.test(action.label)) ?? [null, Zap, 'brand' as StatTone]
          const to = resolveLegacyRoute(action.href)
          const body = (
            <>
              <span className={`w-10 h-10 rounded-xl grid place-items-center ${TONE_CLS[tone]}`}>
                <Icon size={18} />
              </span>
              <span className="text-xs font-medium text-text leading-tight">{action.label}</span>
            </>
          )
          const cls = 'flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-alt/50 py-3.5 px-1.5 text-center'
          return to ? (
            <Link key={action.label} to={to} className={`${cls} hover:bg-surface-alt transition-colors`}>
              {body}
            </Link>
          ) : (
            <span key={action.label} aria-disabled="true" title="This page is not available in the new interface yet" className={`${cls} opacity-50 cursor-not-allowed`}>
              {body}
            </span>
          )
        })}
      </div>
    </GlassCard>
  )
}

export function HomeOverview({ username, dashboard }: { username: string; dashboard: HomeDashboard }) {
  const [tab, setTab] = useState<'sales' | 'purchase'>('sales')
  const { theme } = useTheme()
  const { date, time } = useClock()
  const side = tab === 'sales' ? dashboard.sales : dashboard.purchase
  const currency = dashboard.kpis.todaySales?.currency || dashboard.kpis.unpaid?.currency || 'ZMW'

  return (
    <div className="space-y-4">
      {/* ── Greeting + today's KPI cards ─────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 bg-[linear-gradient(135deg,var(--color-hero-from)_0%,var(--color-hero-via)_55%,var(--color-surface)_100%)] border border-border shadow-sm"
        style={
          theme === 'blue-metal'
            ? {
                backgroundImage: "linear-gradient(90deg, rgba(5,17,31,0.94) 0%, rgba(5,17,31,0.82) 52%, rgba(5,17,31,0.66) 100%), url('/blue-metal-dashboard.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center 54%',
              }
            : undefined
        }
      >
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getGreetingEmoji()}</span>
              <h2 className="text-xl font-bold text-hero-heading">
                {getGreeting()}, {username}!
              </h2>
            </div>
            <p className="text-text-muted text-sm">Here&apos;s what&apos;s happening with your business today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dashboard.cashSession && (
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${dashboard.cashSession === 'open' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                Cash Session: {dashboard.cashSession === 'open' ? 'Open' : 'Closed'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-hero-heading backdrop-blur-sm">
              <CalendarDays size={13} />
              {date}
              <span className="text-text-faint">·</span>
              <span className="tabular-nums">{time}</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiTile kpi={dashboard.kpis.todaySales} label="Today's Sales" icon={ShoppingCart} tone="brand" />
          <KpiTile kpi={dashboard.kpis.todayPurchase} label="Today's Purchase" icon={ShoppingBag} tone="info" />
          <KpiTile kpi={dashboard.kpis.unpaid} label="Unpaid Invoices" icon={FileText} tone="warning" />
          <KpiTile kpi={dashboard.kpis.zraSigned} label="ZRA Signed Invoices" icon={ShieldCheck} tone="success" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ── Sales / Purchase tab: donut, analytics, last 7, by country ── */}
        <div className="xl:col-span-9 space-y-4 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <DonutCard side={side} tab={tab} onTab={setTab} />
            <AnalyticsCard key={tab} side={side} tab={tab} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Last7Card rows={side.last7} tab={tab} currency={currency} />
            <CountryCard side={side} tab={tab} currency={currency} />
          </div>
        </div>

        {/* ── Bank balances, attention items, quick actions ─────────────── */}
        <div className="xl:col-span-3 space-y-4 min-w-0">
          <BankCard banks={dashboard.banks} />
          <AttentionCard items={dashboard.attention} />
          <QuickActionsCard actions={dashboard.quickActions} />
        </div>
      </div>
    </div>
  )
}
