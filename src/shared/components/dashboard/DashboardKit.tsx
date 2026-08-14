import { type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
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
  return <div className={`bg-surface-alt border border-border rounded-xl p-4 h-full flex flex-col ${className}`}>{children}</div>
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
}: {
  label: string
  count: number
  color: IconColor
  icon: ComponentType<{ size?: number }>
  listPath?: string
  newPath?: string
  extraLink?: StatCardLink
}) {
  return (
    <Card className="!p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-text! mt-1">{count}</p>
        </div>
        <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
          <Icon size={18} />
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
  caption: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
}) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-0.5">{caption}</p>
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
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
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">
          {primary} <span className="text-xs font-normal text-text-faint">{primaryLabel}</span>
        </p>
        <p className="text-sm font-semibold text-text! mt-0.5">
          {secondary} <span className="text-xs font-normal text-text-faint">{secondaryLabel}</span>
        </p>
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
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
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  actions: (ActionTileSpec & { path?: string })[]
  columns?: 2 | 3
}) {
  return (
    <Card>
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
