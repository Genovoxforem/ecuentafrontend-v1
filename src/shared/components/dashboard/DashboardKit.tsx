import { type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../../context/ThemeContext'
import { formatMoney } from '../../../utils/format'

// Shared building blocks for the "module dashboard" pages ported from the
// reference app (Sales, Purchases, Warehouse, Payroll, ...) — each one is an
// Overall-Statistics stat-card row + a Today's-Activity row + a
// chart/status-table/top-list three-column row, just with different labels,
// icons, and data. Factored out here after the second near-identical copy
// (Sales, then Purchases) rather than duplicated a third time.

export const fmtZMW = (n: number) => `${formatMoney(n)} ZMW`

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export function fmtLongDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`app-card bg-surface-alt border border-border rounded-xl p-4 h-full flex flex-col ${className}`}>{children}</div>
}

// Purely a visual texture next to the number (same role as the page banner's
// own background chart graphic, see PageBanner.tsx) — a fixed bar pattern
// derived from the label text, not a plot of any real daily/weekly figures.
// No per-tile time series exists on the backend for these totals, so this
// never claims to show one: heights are deterministic (stable across
// re-renders, same tile always looks the same) rather than random noise.
function decorativeBarHeights(seed: string): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return Array.from({ length: 8 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0
    return 25 + (h % 75) + i // mild upward drift, same flavor as the reference tile
  }).map((v) => Math.min(100, v))
}

function DecorativeSparkline({ seed, color }: { seed: string; color: string }) {
  const heights = decorativeBarHeights(seed)
  return (
    <span className="hidden lg:flex h-8 w-10 shrink-0 items-end gap-[2px]" aria-hidden="true">
      {heights.map((v, i) => (
        <i key={i} className="block w-[3px] rounded-sm" style={{ height: `${v}%`, background: color, opacity: 0.35 + (v / 100) * 0.55 }} />
      ))}
    </span>
  )
}

const DETAIL_TILE_ACCENT: Record<IconColor, string> = {
  blue: '#3b82f6',
  cyan: '#06b6d4',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#ec4899',
  violet: '#8b5cf6',
  indigo: '#6366f1',
}

export function DetailMetricTile({
  label,
  value,
  icon: Icon,
  color = 'blue',
  sparkline = true,
}: {
  label: string
  value: ReactNode
  icon: ComponentType<{ size?: number; className?: string }>
  color?: IconColor
  // Off for tiles whose value isn't a running total (dates, labels, free text) —
  // a trend-shaped decoration next to "Start Date: 01/01/2026" would be misleading.
  sparkline?: boolean
}) {
  return (
    <div className="flex flex-1 min-w-[175px] items-center gap-2.5 px-3 first:pl-1 last:pr-1">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_STYLES[color]}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-text-faint uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-text!">{value}</p>
      </div>
      {sparkline && <DecorativeSparkline seed={label} color={DETAIL_TILE_ACCENT[color]} />}
    </div>
  )
}

// Lays out a row of DetailMetricTile with a vertical divider between each —
// the common KPI strip shared by every detail page (Customer, Project,
// Warehouse, Inventory, Pay Run, ...).
export function DetailMetricRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center divide-x divide-border ${className}`}>{children}</div>
}

export function SectionHeading({ icon: Icon, children }: { icon: ComponentType<{ size?: number; className?: string }>; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-text!">
      <Icon size={16} className="text-brand" /> {children}
    </h3>
  )
}

export const ICON_STYLES = {
  blue: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
  cyan: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400',
  green: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400',
  violet: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400',
  indigo: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400',
} as const
export type IconColor = keyof typeof ICON_STYLES

// Solid-filled status pills for a detail page's identity row (Customer /
// Active / "It is succeeded", ...) — same semantic tones every soft badge in
// this app already uses, just filled solid rather than tinted, for the rows
// that sit directly on the banner's own dark/photo surface where a soft tint
// reads too faint.
export type PillTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
const PILL_STYLES: Record<PillTone, string> = {
  brand: 'bg-brand text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
  neutral: 'bg-surface-hover text-text-muted',
}

export function StatusPill({ tone = 'neutral', icon: Icon, children }: { tone?: PillTone; icon?: ComponentType<{ size?: number }>; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${PILL_STYLES[tone]}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  )
}

// One of the small identity-row chips that pair a colored icon square with a
// value (a customer/supplier code, a location, ...) — with an optional label
// line above the value when there's room to name what the value is.
export function InfoChip({
  icon: Icon,
  label,
  value,
  color = 'blue',
}: {
  icon: ComponentType<{ size?: number }>
  label?: string
  value: ReactNode
  color?: IconColor
}) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_STYLES[color]}`}>
        <Icon size={15} />
      </span>
      {label ? (
        <span className="min-w-0 leading-tight">
          <span className="block text-[10px] text-text-faint whitespace-nowrap">{label}</span>
          <span className="block text-sm font-semibold text-text! truncate">{value}</span>
        </span>
      ) : (
        <span className="text-sm font-semibold text-text! truncate">{value}</span>
      )}
    </span>
  )
}

export interface StatCardLink {
  label: string
  path: string
}

export function StatCard({
  label,
  count,
  color,
  icon: Icon,
  listPath,
  newPath,
  extraLink,
  className,
}: {
  label: string
  count: number
  color: IconColor
  icon: ComponentType<{ size?: number }>
  listPath?: string
  newPath?: string
  extraLink?: StatCardLink
  className?: string
}) {
  const { theme } = useTheme()
  const compact = theme === 'blue-metal'
  return (
    <Card className={`${className ?? ''} ${compact ? 'blue-compact-card' : '!p-3'} flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
          <p className={`${compact ? 'text-sm mt-0' : 'text-2xl mt-1'} font-bold text-text!`}>{count}</p>
        </div>
        <span className={`shrink-0 ${compact ? 'w-6 h-6 rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center ${ICON_STYLES[color]}`}>
          <Icon size={compact ? 14 : 18} />
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {listPath && (
          <Link to={listPath} className="flex items-center gap-1 text-brand hover:underline">
            <LayoutGrid size={11} /> List
          </Link>
        )}
        {newPath && (
          <Link to={newPath} className="flex items-center gap-1 text-brand hover:underline">
            + New
          </Link>
        )}
        {extraLink && (
          <Link to={extraLink.path} className="flex items-center gap-1 text-brand hover:underline">
            + {extraLink.label}
          </Link>
        )}
      </div>
    </Card>
  )
}

export function TodayStatCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  caption: ReactNode
  icon: ComponentType<{ size?: number }>
  color: IconColor
}) {
  const { theme } = useTheme()
  const compact = theme === 'blue-metal'
  return (
    <Card className={`${compact ? 'blue-compact-card gap-2' : '!p-3 gap-3'} !flex-row items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className={`${compact ? 'text-sm mt-0' : 'text-xl mt-1'} font-bold text-text!`}>{value}</p>
        <div className="text-xs text-text-faint mt-0.5">{caption}</div>
      </div>
      <span className={`shrink-0 ${compact ? 'w-6 h-6 rounded-md' : 'w-10 h-10 rounded-lg'} flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={compact ? 14 : 20} />
      </span>
    </Card>
  )
}

// A stat card showing two related counts stacked (e.g. "Validated" +
// "Draft", or "Running total" + "Started this month") instead of one big
// number — the reference dashboards use this whenever a single metric alone
// wouldn't convey the split that matters.
export function TwoValueStatCard({
  label,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
  icon: Icon,
  color,
}: {
  label: string
  primary: number
  primaryLabel: string
  secondary: number
  secondaryLabel: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
}) {
  const { theme } = useTheme()
  const compact = theme === 'blue-metal'
  return (
    <Card className={`${compact ? 'blue-compact-card gap-2' : '!p-3 gap-3'} !flex-row items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className={`${compact ? 'text-sm mt-0' : 'text-xl mt-1'} font-bold text-text!`}>
          {primary} <span className="text-xs font-normal text-text-faint">{primaryLabel}</span>
        </p>
        <p className={`${compact ? 'text-xs mt-0' : 'text-sm mt-0.5'} font-semibold text-text!`}>
          {secondary} <span className="text-xs font-normal text-text-faint">{secondaryLabel}</span>
        </p>
      </div>
      <span className={`shrink-0 ${compact ? 'w-6 h-6 rounded-md' : 'w-10 h-10 rounded-lg'} flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={compact ? 14 : 20} />
      </span>
    </Card>
  )
}

export interface InvoiceStatusRow {
  status: string
  count: number
  amount: number
}

export function InvoiceStatusChart({ title, rows }: { title: string; rows: InvoiceStatusRow[] }) {
  const hasData = rows.some((row) => row.count > 0)
  return (
    <Card>
      <SectionHeading icon={PieChartIcon}>{title}</SectionHeading>
      <div className="flex-1 min-h-56 flex items-center justify-center mt-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {rows.map((row, i) => (
                  <Cell key={row.status} fill={`var(--color-chart-${(i % 8) + 1})`} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-text-faint">Not enough data...</p>
        )}
      </div>
    </Card>
  )
}

export function InvoiceStatusTable({ title, rows }: { title: string; rows: InvoiceStatusRow[] }) {
  const total = rows.reduce((acc, row) => ({ count: acc.count + row.count, amount: acc.amount + row.amount }), { count: 0, amount: 0 })
  return (
    <Card className="!p-0 overflow-x-auto">
      <div className="p-4 pb-0">
        <SectionHeading icon={LayoutGrid}>{title}</SectionHeading>
      </div>
      <table className="w-full text-sm mt-3">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-y border-border bg-surface">
            <th className="font-medium px-4 py-2.5">Status</th>
            <th className="font-medium px-4 py-2.5 text-right">Count</th>
            <th className="font-medium px-4 py-2.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.status} className="border-b border-border">
              <td className="px-4 py-3 text-text-muted">{row.status}</td>
              <td className="px-4 py-3 text-right">
                <span className="inline-block min-w-6 rounded bg-surface-hover px-1.5 text-text-muted">{row.count}</span>
              </td>
              <td className="px-4 py-3 text-right text-text! tabular-nums">{formatMoney(row.amount)} ZMW</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="px-4 py-3 text-text!">Total</td>
            <td className="px-4 py-3 text-right">
              <span className="inline-block min-w-6 rounded bg-brand/10 px-1.5 text-brand">{total.count}</span>
            </td>
            <td className="px-4 py-3 text-right text-text! tabular-nums">{formatMoney(total.amount)} ZMW</td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

export interface ActionTileSpec {
  icon: ComponentType<{ size?: number }>
  label: string
  color?: IconColor
}

// Cycled when an action doesn't specify its own color, so every
// ActionGroupCard gets varied, legible icon badges (matching the reference
// app's colorful per-action icons) without every call site needing to pick
// one explicitly.
const ACTION_TILE_COLORS: IconColor[] = ['blue', 'green', 'amber', 'violet', 'rose', 'cyan', 'indigo']

// A stub-safe action button: disabled/inert until a real route exists for it,
// so pages can show the full reference layout without inventing fake links.
// Pass `path` once the corresponding page is built.
export function ActionTile({ icon: Icon, label, path, color = 'blue' }: ActionTileSpec & { path?: string }) {
  const className = 'group flex flex-col items-center justify-center gap-2 rounded-lg bg-surface border border-border p-3 text-center text-xs transition-all'
  const badge = (
    <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${ICON_STYLES[color]}`}>
      <Icon size={18} />
    </span>
  )
  if (path) {
    return (
      <Link to={path} className={`${className} text-text hover:border-brand/40 hover:shadow-sm hover:-translate-y-0.5`}>
        {badge}
        {label}
      </Link>
    )
  }
  return (
    <button type="button" disabled title="Not built yet" className={`${className} text-text-muted cursor-default opacity-70`}>
      {badge}
      {label}
    </button>
  )
}

export function ActionGroupCard({
  icon,
  title,
  actions,
  columns = 3,
  className = '',
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  actions: (ActionTileSpec & { path?: string })[]
  columns?: 2 | 3
  className?: string
}) {
  return (
    <Card className={className}>
      <SectionHeading icon={icon}>{title}</SectionHeading>
      <div className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-3`}>
        {actions.map((a, i) => (
          <ActionTile key={a.label} icon={a.icon} label={a.label} path={a.path} color={a.color ?? ACTION_TILE_COLORS[i % ACTION_TILE_COLORS.length]} />
        ))}
      </div>
    </Card>
  )
}

export interface TopProductRow {
  product: string
  count: number
}

export function TopProductsTable({
  icon,
  title,
  year,
  rows,
  emptyLabel = 'No data yet.',
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  year: number
  rows: TopProductRow[]
  emptyLabel?: string
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return (
    <Card className="!p-0 overflow-x-auto">
      <div className="flex items-center justify-between p-4 pb-0">
        <SectionHeading icon={icon}>{title}</SectionHeading>
        <span className="text-xs font-medium rounded-md border border-border px-2 py-1 text-text-muted">{year}</span>
      </div>
      <table className="w-full text-sm mt-3">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-y border-border bg-surface">
            <th className="font-medium px-4 py-2.5">Product</th>
            <th className="font-medium px-4 py-2.5 text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-text-faint italic" colSpan={2}>
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.product} className="border-b border-border">
              <td className="px-4 py-3 text-text-muted">{row.product}</td>
              <td className="px-4 py-3 text-right text-text!">{row.count}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="px-4 py-3 text-text!">Total</td>
            <td className="px-4 py-3 text-right">
              <span className="inline-block min-w-6 rounded bg-brand/10 px-1.5 text-brand">{total}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}
