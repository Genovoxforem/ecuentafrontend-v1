import { useEffect, useState, type ReactNode } from 'react'
import { PHARMACY_TOAST_EVENT, type PharmacyToastDetail } from '../pharmacyToast'
import { Info, Loader2, type LucideIcon } from 'lucide-react'
import { PharmacyApiError } from '../pharmacy.api'

// A card with a fixed head (title + actions), an optional fixed toolbar (chips / search), a body that scrolls on its own (table
// headers stay put) and an optional fixed footer. It fills the page height when its parent gives it `min-h-0 flex-1`.
export function Panel({ title, sub, right, toolbar, footer, children, className = '' }: { title: string; sub?: string; right?: ReactNode; toolbar?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`${card} flex min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text! truncate">{title}</p>
          {sub && <p className="text-xs text-text-faint truncate">{sub}</p>}
        </div>
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {toolbar && <div className="shrink-0">{toolbar}</div>}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-border px-4 py-2 text-xs text-text-faint">{footer}</div>}
    </div>
  )
}

const card = 'rounded-2xl border border-border bg-surface-alt'

const TONES = {
  ok: 'bg-success-bg text-success-fg',
  warn: 'bg-warning-bg text-warning-fg',
  bad: 'bg-danger-bg text-danger-fg',
  neutral: 'bg-surface-hover text-text-muted',
  info: 'bg-info-bg text-info-fg',
} as const

export function Pill({ tone = 'neutral', children, dot = true }: { tone?: keyof typeof TONES; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Tile({ label, value, note, pill, tone }: { label: string; value: ReactNode; note?: string; pill?: string; tone?: keyof typeof TONES }) {
  return (
    <div className={`${card} flex flex-col gap-1.5 p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-faint">{label}</p>
      <p className="font-serif text-3xl font-semibold text-text! tabular-nums">{value}</p>
      {(pill || note) && (
        <div className="flex items-center gap-2 text-xs text-text-faint">
          {pill && <Pill tone={tone ?? 'neutral'}>{pill}</Pill>}
          {pill || !tone ? note : <Pill tone={tone}>{note}</Pill>}
        </div>
      )}
    </div>
  )
}

// Loading / error / (optionally) empty message in one place. `error` is shown as received; a missing legacy
// session (the endpoint answered the login page) is the one case that gets its own wording.
export function Status({ loading, error, empty, emptyText = 'No data available.' }: { loading?: boolean; error?: unknown; empty?: boolean; emptyText?: string }) {
  if (loading)
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-sm text-text-faint">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    )
  if (error) {
    const msg = error instanceof PharmacyApiError || error instanceof Error ? error.message : 'Unknown error.'
    return <div className="px-4 py-4 text-sm text-danger-fg">{msg}</div>
  }
  if (empty) return <div className="px-4 py-6 text-center text-sm text-text-faint">{emptyText}</div>
  return null
}

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
}

export function DataTable<T>({ columns, rows, rowKey, footer }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T, i: number) => string | number; footer?: ReactNode }) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-faint">
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="border-b border-border last:border-0 hover:bg-surface-hover">
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
          {footer}
        </tbody>
      </table>
    </div>
  )
}

const cellText = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v))

// For lists that were empty on newecuenta, so their row fields have not been seen: with no rows it shows the classic
// screen's own column headings; with rows it shows the keys each row really carries (no field names assumed).
export function RawTable({ rows, classicColumns, emptyText }: { rows: Record<string, unknown>[]; classicColumns: string[]; emptyText?: string }) {
  if (rows.length === 0) return <DataTable<Record<string, unknown>> columns={classicColumns.map((h) => ({ header: h, cell: () => null }))} rows={[]} rowKey={(_, i) => i} footer={<tr><td colSpan={classicColumns.length} className="px-4 py-6 text-center text-sm text-text-faint">{emptyText ?? 'No data available.'}</td></tr>} />
  const keys = Object.keys(rows[0])
  return <DataTable columns={keys.map((k) => ({ header: k, cell: (r: Record<string, unknown>) => cellText(r[k]) }))} rows={rows} rowKey={(r, i) => String(r.id ?? i)} />
}

// The blue info strip the classic screens open with.
export function Notice({ icon: Icon = Info, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-info-bg px-4 py-2.5 text-sm text-info-fg">
      <Icon size={15} className="shrink-0" />
      <span>{children}</span>
    </div>
  )
}

// Client-side CSV of rows already on screen (the classic "Export CSV").
export function downloadCsv(name: string, headers: string[], rows: unknown[][]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const blob = new Blob([[headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export function GhostButton({ onClick, children, disabled }: { onClick?: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-50">
      {children}
    </button>
  )
}

// Right-hand detail card on Medicines / Patients / Prescriptions: green header (serif name + line), then key/value rows.
export function DetailCard({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${card} max-h-full self-start overflow-y-auto`}>
      <div className="bg-linear-to-br from-[#0a6b52] to-[#12a07c] px-5 py-4 text-white">
        <h3 className="font-serif text-xl font-semibold">{title}</h3>
        {sub && <p className="mt-0.5 text-xs opacity-90">{sub}</p>}
      </div>
      <div className="p-4 text-sm">{children}</div>
    </div>
  )
}

export function Kv({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 border-b border-border py-2.5 last:border-0">
      <dt className="text-text-faint">{label}</dt>
      <dd className="min-w-0 font-medium text-text!">{children || '–'}</dd>
    </div>
  )
}

export function Chips<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {items.map((c) => (
        <button key={c.key} type="button" onClick={() => onChange(c.key)} className={`rounded-full px-3 py-1 text-xs font-semibold ${c.key === value ? 'bg-(--color-brand) text-white' : 'bg-surface-hover text-text-muted hover:text-text!'}`}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

// Bottom-corner toasts raised by pharmacyToast() ("Prescription verified", "Save failed", ...).
export function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; message: string; error: boolean }[]>([])
  useEffect(() => {
    let n = 0
    const on = (e: Event) => {
      const { message, error } = (e as CustomEvent<PharmacyToastDetail>).detail
      const id = ++n
      setToasts((t) => [...t, { id, message, error }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
    }
    window.addEventListener(PHARMACY_TOAST_EVENT, on)
    return () => window.removeEventListener(PHARMACY_TOAST_EVENT, on)
  }, [])
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto max-w-sm rounded-xl border px-4 py-2.5 text-sm shadow-lg ${t.error ? 'border-danger-fg/40 bg-danger-bg text-danger-fg' : 'border-border bg-surface-alt text-text'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
