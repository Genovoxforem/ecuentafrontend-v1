import { Landmark, TrendingUp, TrendingDown, FileText } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ComposedChart,
  Bar,
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
import type { DashboardSummary } from '../home.queries'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DONUT_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-8)']
const STATUS_STYLES: Record<number, { label: string; cls: string }> = {
  0: { label: 'Draft', cls: 'bg-neutral-bg text-neutral-fg' },
  1: { label: 'Validated', cls: 'bg-warning-bg text-warning-fg' },
  2: { label: 'Paid', cls: 'bg-info-bg text-info-fg' },
  3: { label: 'Abandoned', cls: 'bg-danger-bg text-danger-fg' },
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

  const todayStats = [
    { label: "Today's Invoices", value: String(today.invoices_count) },
    { label: "Today's sales Amount", value: fmtMoney(today.sales_amount) },
    { label: "Today's Refund", value: fmtMoney(0) },
    { label: "Today's Purchase", value: String(today.purchases_count) },
    { label: "Today's Purchase Amount", value: fmtMoney(today.purchases_amount) },
  ]

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

  return (
    <div className="space-y-4">
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
            <div className="grid grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-5 gap-3 mt-4">
              {todayStats.map((s) => {
                const [first, ...rest] = s.label.split(' ')
                return (
                  <div key={s.label} className="min-w-0 h-[7.5rem] rounded-lg bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 px-3.5 py-3 flex flex-col justify-between">
                    <p className="text-text-muted text-xs @sm:text-[13px] @lg:text-sm leading-tight font-medium">
                      <span className="block">{first}</span>
                      <span className="block">{rest.join(' ')}</span>
                    </p>
                    <p className="text-sm @sm:text-base font-bold text-hero-heading truncate">{s.value}</p>
                  </div>
                )
              })}
            </div>
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
          <div className="h-37 overflow-y-auto soft-scrollbar pr-2">
            {banks.length === 0 && <p className="text-xs text-text-faint">No bank accounts yet.</p>}
            {banks.map((b) => {
              const balance = Number(b.balance)
              const up = balance >= 0
              const Icon = up ? TrendingUp : TrendingDown
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-text!">
                      <Landmark size={14} className="text-text-faint" />
                      {b.label}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-xs ${up ? 'text-success' : 'text-danger'}`}>
                      <Icon size={12} />
                    </span>
                  </div>
                  <p className="text-xs text-text-faint mb-1">{fmtMoney(balance)}</p>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div className={`h-full w-3/5 ${up ? 'bg-success' : 'bg-danger'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-2 !p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {(['Sales', 'Purchase'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-md text-sm ${tab === t ? 'bg-brand! text-white!' : 'text-text-muted hover:bg-surface-hover'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-surface-alt text-text-muted">Whole Year</span>
          </div>

          <div className="flex flex-col gap-2 items-center">
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

            <div className="grid grid-cols-2 gap-2 w-full text-center">
              <div>
                <p className="text-lg font-bold text-text!">{breakdown.draft_count}</p>
                <p className="text-xs text-text-muted">Draft</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text!">{breakdown.validated_count}</p>
                <p className="text-xs text-text-muted">Validated</p>
              </div>
            </div>
          </div>

          {tab === 'Sales' && (
            <div className="grid grid-cols-3 gap-2 w-full text-center mt-2 pt-2 border-t border-border">
              <div>
                <p className="text-lg font-bold text-text!">{legacyCounts.salesOrders.value}</p>
                <p className="text-xs text-text-muted">Total Sales Orders</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text!">{legacyCounts.quotationsCount}</p>
                <p className="text-xs text-text-muted">Total Quotations</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text!">{legacyCounts.contracts.value}</p>
                <p className="text-xs text-text-muted">Total Contract</p>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1 text-sm">
            {(
              [
                [tab === 'Sales' ? 'Total Sale Amount' : 'Total Purchase Amount', fmtMoney(breakdown.total_amount)],
                ['Paid Amount', fmtMoney(breakdown.paid_amount)],
                ['Balance Amount', fmtMoney(balanceAmount)],
                // No refund total in the API yet — shown as 0 to match the
                // legacy layout until a backend field exists to wire this to.
                ['Total Refund', fmtMoney(0)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-text-muted">{label}</span>
                <span className="text-text!">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="md:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-text!">Sales Analytics</h3>
              <p className="text-xs text-text-faint">
                {fmtDate(period.dateStart)} - {fmtDate(addYears(period.dateStart, 1))}
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-base font-bold text-text!">{fmtMoney(yearIncome)}</p>
                <p className="text-xs text-text-faint">Income</p>
              </div>
              <div>
                <p className="text-base font-bold text-text!">{yearSales}</p>
                <p className="text-xs text-text-faint">Sales</p>
              </div>
              <div>
                <p className="text-base font-bold text-text!">{yearCustomers}</p>
                <p className="text-xs text-text-faint">Customers</p>
              </div>
            </div>
          </div>

          {/* Two single-axis charts, not one dual-axis chart: Income (currency,
              ~millions) and Sales/Customers (counts, 0-200) don't share a scale —
              overlaying them on a shared plot with two y-axes lets the axis
              alignment invent a correlation that isn't in the data. */}
          <p className="text-xs font-medium text-text-muted mb-1">Income</p>
          <ResponsiveContainer width="100%" height={80}>
            <ComposedChart data={analyticsData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="none" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} width={32} tickFormatter={fmtAxisMoney} />
              <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="income" name="Income" stroke="var(--color-chart-1)" fill="url(#incomeFill)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>

          <p className="text-xs font-medium text-text-muted mt-3 mb-1">Sales &amp; Customers</p>
          <ResponsiveContainer width="100%" height={90}>
            <ComposedChart data={analyticsData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="none" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey="sales" name="Sales" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} barSize={16} />
              <Line type="monotone" dataKey="customers" name="Customers" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text!">Last 7 Sales</h3>
            <Link to={ROUTES.reports} className="text-sm text-brand hover:underline">
              View All
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-xs text-text-faint">No sales yet.</p>
          ) : (
            <div className="overflow-x-auto">
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
                        <td className="py-2 pr-2">
                          <span className="flex items-center gap-1.5 text-brand">
                            <FileText size={13} />
                            {sale.ref || '(draft)'}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-text-muted whitespace-nowrap">{fmtInvoiceDate(sale.datef)}</td>
                        <td className="py-2 pr-2 text-brand">{sale.company_name}</td>
                        <td className="py-2 pr-2 text-text! text-right tabular-nums">{fmtNumber(sale.total_ttc)}</td>
                        <td className="py-2 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-3 text-text!">Sales by Country</h3>
          <WorldMapDecoration />
          <div className="space-y-3 mt-4">
            {salesByCurrency.length === 0 && <p className="text-xs text-text-faint">No sales yet.</p>}
            {salesByCurrency.map((row) => {
              const widthPct = currencyMax > 0 ? (Number(row.total) / currencyMax) * 100 : 0
              return (
                <div key={row.currency}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text! font-medium">{row.currency}</span>
                    <span className="text-xs text-text-faint tabular-nums">{fmtNumber(row.total)}</span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
