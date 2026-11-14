import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'

// Small building blocks shared by the custom/reports screens (Monthly Statement, Customer Report): the coloured KPI card, the label/value box,
// a titled block, tabs, the date-range bar and plain tables. Colours follow the app's tokens, not the classic page's fixed palette.

export type ReportTone = 'green' | 'orange' | 'blue' | 'red' | 'rose' | 'purple' | 'teal' | 'indigo' | 'amber'

const TONE_BAR: Record<ReportTone, string> = {
  green: 'bg-emerald-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  rose: 'bg-rose-500',
  purple: 'bg-violet-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
}

const TONE_BADGE: Record<ReportTone, string> = {
  green: 'bg-emerald-500 text-white',
  orange: 'bg-orange-500 text-white',
  blue: 'bg-blue-500 text-white',
  red: 'bg-red-500 text-white',
  rose: 'bg-rose-500 text-white',
  purple: 'bg-violet-500 text-white',
  teal: 'bg-teal-500 text-white',
  indigo: 'bg-indigo-500 text-white',
  amber: 'bg-amber-500 text-white',
}

export const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
export const primaryBtn = 'h-9 inline-flex items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
export const secondaryBtn = 'h-9 inline-flex items-center gap-2 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-hover'

// A KPI card: a coloured top edge, the label, the figure and a line under it.
export function KpiCard({ label, value, sub, tone, icon: Icon }: { label: string; value: ReactNode; sub?: ReactNode; tone: ReportTone; icon?: ComponentType<{ size?: number }> }) {
  return (
    <Card className="relative !h-auto overflow-hidden !p-4 pt-5">
      <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR[tone]}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">{label}</p>
          {value !== '' && <p className="mt-1 text-2xl font-bold text-text!">{value}</p>}
          {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
        </div>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_BADGE[tone]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
    </Card>
  )
}

// A small bordered box: an uppercase label over a figure.
export function MiniStat({ label, value, valueClass = '' }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-text-faint">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${valueClass || 'text-text!'}`}>{value}</p>
    </div>
  )
}

// A titled card: an icon badge, the title and an optional element on the right.
export function ReportBlock({ title, icon: Icon, tone, right, children, className = '' }: { title: string; icon: ComponentType<{ size?: number }>; tone: ReportTone; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`!h-auto ${className}`}>
      <div className="mb-3 flex items-center gap-2 font-semibold text-text!">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_BADGE[tone]}`}>
          <Icon size={15} />
        </span>
        {title}
        {right && <span className="ml-auto flex items-center gap-1">{right}</span>}
      </div>
      {children}
    </Card>
  )
}

// A label / value line (Payroll Summary, order totals).
export function ValueLine({ label, value, valueClass = '' }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-text-muted">{label}</span>
      <strong className={valueClass || 'text-text!'}>{value}</strong>
    </div>
  )
}

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: Array<{ key: T; label: ReactNode }>; value: T; onChange: (k: T) => void }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1 border-b border-border" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          onClick={() => onChange(t.key)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${t.key === value ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export interface SimpleTableProps {
  headers: string[]
  rows: ReactNode[][]
  // Text shown when there are no rows.
  empty: string
  // Column indexes printed right-aligned (amounts, counts).
  right?: number[]
  // Column indexes printed centred.
  center?: number[]
  footer?: ReactNode[]
}

export function SimpleTable({ headers, rows, empty, right = [], center = [], footer }: SimpleTableProps) {
  const align = (i: number) => (right.includes(i) ? 'text-right' : center.includes(i) ? 'text-center' : 'text-left')
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
            {headers.map((h, i) => (
              <th key={i} className={`px-2 py-2 font-medium whitespace-nowrap ${align(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-2 py-4 text-center text-text-faint">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {r.map((c, ci) => (
                  <td key={ci} className={`px-2 py-2 text-text-muted ${align(ci)}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t border-border font-semibold text-text">
              {footer.map((c, i) => (
                <td key={i} className={`px-2 py-2 ${align(i)}`}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function Badge({ tone, children }: { tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral'; children: ReactNode }) {
  const cls = {
    success: 'bg-success-bg text-success-fg',
    danger: 'bg-danger-bg text-danger-fg',
    warning: 'bg-warning-bg text-warning-fg',
    info: 'bg-info-bg text-info-fg',
    neutral: 'bg-surface-hover text-text-muted',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>
}

// "Date Range" of the classic filter bar: a from and a to date and the button that applies them (the report is only read when it is pressed).
export function RangeBar({
  start,
  end,
  onApply,
  buttonLabel = 'Generate',
  label = 'Date Range',
  children,
  right,
}: {
  start: string
  end: string
  onApply: (start: string, end: string) => void
  buttonLabel?: string
  // What the classic page calls the period ("Date Range", "Report period").
  label?: string
  children?: ReactNode
  right?: ReactNode
}) {
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(end)
  const bad = !from || !to || from > to
  return (
    <Card className="!h-auto">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">{label}</span>
          <span className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} aria-label="From" />
            <span className="text-text-muted">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} aria-label="To" />
          </span>
        </label>
        {children}
        <button type="button" disabled={bad} onClick={() => onApply(from, to)} className={primaryBtn}>
          <Search size={14} /> {buttonLabel}
        </button>
        {right && <div className="ml-auto text-sm text-text-muted">{right}</div>}
      </div>
      {from > to && to && <p className="mt-2 text-xs text-danger-fg">The start date is after the end date.</p>}
    </Card>
  )
}

// A labelled select of the classic filter bars: the blank entry ("All", "Select All") first, then the options.
export function SelectField({
  label,
  value,
  onChange,
  options,
  blank = 'All',
  minWidth = 'min-w-44',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  blank?: string
  minWidth?: string
}) {
  return (
    <label className="text-sm font-medium text-text">
      <span className="mb-1 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} ${minWidth}`} aria-label={label}>
        <option value="">{blank}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// A drop-down that picks several values (the classic POS Terminals / Till Users / Payment Types boxes): the button shows what is picked, the list under it has a
// tick box per option and closes on a click outside or Escape. Nothing picked = all.
export function MultiSelectDropdown({ label, options, value, onChange, allLabel = 'All', minWidth = 'min-w-44' }: { label: string; options: Array<{ value: string; label: string }>; value: string[]; onChange: (v: string[]) => void; allLabel?: string; minWidth?: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const picked = options.filter((o) => value.includes(o.value))
  const summary = picked.length === 0 ? allLabel : picked.length <= 2 ? picked.map((o) => o.label).join(', ') : `${picked.length} selected`
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div ref={box} className={`relative ${minWidth}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={label} aria-haspopup="listbox" aria-expanded={open} className={`${inputCls} flex w-full items-center justify-between gap-2 text-left`}>
        <span className="truncate">{summary}</span>
        <ChevronDown size={14} className="shrink-0 text-text-faint" />
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" aria-label={label} className="absolute left-0 top-full z-30 mt-1 max-h-60 w-full min-w-48 overflow-auto rounded-md border border-border bg-surface p-1 shadow-lg">
          {options.length === 0 && <p className="px-2 py-1.5 text-xs text-text-faint">No options</p>}
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-text hover:bg-surface-hover">
              <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-brand hover:bg-surface-hover">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ReportLoading({ label }: { label: string }) {
  return <LegacyLoadingCard label={label} />
}

export function ReportError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={onRetry} />
}
