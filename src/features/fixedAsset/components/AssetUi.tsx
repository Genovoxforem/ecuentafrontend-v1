import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Loader2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { BannerNote } from '../../../shared/components/layout/bannerSlot'
import { ROUTES } from '../../../routes'
import { CLASSIC_VIEWS, type ClassicAssetView } from '../assetClassicView.data'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect, type SearchableSelectOption } from '../../../shared/components/forms/SearchableSelect'
import { AssetApiError, errorText } from '../assetService'
import { DANGER_BTN, GHOST_BTN, PRIMARY_BTN, isSection, visibleValues, type FieldSpec, type FormItem, type FormValues, type Notice } from '../assetUiHelpers'
import { useLedgerAccounts } from '../assetSetup.data'
import { LIFECYCLE_LABEL, money, type Lifecycle } from '../assetModels'

// Building blocks shared by the Fixed Asset pages: KPI tiles, badges, the segmented filters, the notice strip, the line chart and the
// field-driven form dialog (the "form(fields, values)" / "formDialog" helpers of the classic page's asset-ui.js).

// ---- badges and tiles -------------------------------------------------------------------------------------------------
export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info'
const BADGE: Record<Tone, string> = {
  neutral: 'bg-surface-hover text-text-muted',
  ok: 'bg-success-bg text-success-fg',
  warn: 'bg-warning-bg text-warning-fg',
  bad: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
}

export function Badge({ tone = 'neutral', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[tone]}`}>
      {children}
    </span>
  )
}

const LIFECYCLE_TONE: Record<Lifecycle, Tone> = { draft: 'neutral', in_service: 'ok', disposed: 'bad' }
export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  return <Badge tone={LIFECYCLE_TONE[lifecycle] ?? 'neutral'}>{LIFECYCLE_LABEL[lifecycle] ?? lifecycle}</Badge>
}

export function Cur({ value, currency }: { value: number | string | null | undefined; currency?: string }) {
  return (
    <>
      {money(value)} {currency && <span className="text-[11px] font-normal text-text-faint">{currency}</span>}
    </>
  )
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

const KPI_VALUE: Record<string, string> = { ok: 'text-success-fg', warn: 'text-warning-fg', bad: 'text-danger-fg' }
export function AssetKpi({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <Card className="!h-auto">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone ? KPI_VALUE[tone] : 'text-text!'}`}>{value}</p>
      {note !== undefined && note !== '' && <p className="mt-0.5 text-xs text-text-muted">{note}</p>}
    </Card>
  )
}

// inBanner: the description line is drawn inside the page banner (BannerNote) instead of under the title.
export function PageHeading({ icon: Icon, title, children, action, inBanner }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; children?: ReactNode; action?: ReactNode; inBanner?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
        </h2>
        {children && (inBanner ? <BannerNote>{children}</BannerNote> : <p className="mt-0.5 text-sm text-text-muted">{children}</p>)}
      </div>
      {action}
    </div>
  )
}

// "Classic view ↗" at the top right of every classic asset page: it opens the previous asset module's page. Here it opens that page's React
// copy (AssetClassicViewPage), never the backend .php page.
export function ClassicViewLink({ view }: { view: ClassicAssetView }) {
  return (
    <Link to={CLASSIC_VIEWS[view].route} className={GHOST_BTN}>
      Classic view <ArrowUpRight size={13} />
    </Link>
  )
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: Array<[T, string]>; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map(([v, text]) => (
        <button
          key={v || 'all'}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm font-medium ${value === v ? 'bg-brand text-white' : 'text-text-muted hover:text-text'}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'bad'; children: ReactNode }) {
  const cls = tone === 'bad' ? 'border-danger/30 bg-danger-bg text-danger-fg' : tone === 'warn' ? 'border-warning/30 bg-warning-bg text-warning-fg' : 'border-info/30 bg-info-bg text-info-fg'
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <h3 className="text-base font-semibold text-text!">{title}</h3>
      {children && <div className="mt-1 text-sm text-text-muted">{children}</div>}
    </div>
  )
}

export function NoticeStrip({ notice }: { notice: Notice | null }) {
  return (
    <div role="status" aria-live="polite">
      {notice && <Banner tone={notice.tone === 'bad' ? 'bad' : 'info'}>{notice.text}</Banner>}
    </div>
  )
}

// ---- line chart (inline SVG, as the classic page draws it) -------------------------------------------------------------
export interface ChartSeries {
  name: string
  color: string
  values: number[]
  dash?: boolean
}

export function LineChart({ labels, series, height = 220 }: { labels: string[]; series: ChartSeries[]; height?: number }) {
  const W = 760
  const L = 64
  const R = 12
  const T = 12
  const B = 28
  const all = series.flatMap((s) => s.values)
  const max = Math.max(...all, 1)
  const n = Math.max(labels.length - 1, 1)
  const x = (i: number) => L + ((W - L - R) * i) / n
  const y = (v: number) => T + (height - T - B) * (1 - v / (max || 1))
  const step = Math.ceil(labels.length / 8)
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-text-muted">
            <i className="inline-block h-[3px] w-3.5 rounded-sm" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${series.map((s) => s.name).join(', ')} over time`} className="mx-auto h-auto w-full min-w-[480px] max-w-[900px]">
          {[0, 1, 2, 3, 4].map((g) => {
            const gv = (max * g) / 4
            return (
              <g key={g}>
                <line x1={L} x2={W - R} y1={y(gv)} y2={y(gv)} stroke="var(--color-border)" strokeWidth={1} />
                <text x={L - 6} y={y(gv) + 4} textAnchor="end" fontSize={11} fill="var(--color-text-faint)">
                  {Math.round(gv).toLocaleString('en-US')}
                </text>
              </g>
            )
          })}
          {labels.map((l, i) =>
            i % step === 0 || i === labels.length - 1 ? (
              <text key={l + i} x={x(i)} y={height - 8} textAnchor={i === 0 && labels.length > 1 ? 'start' : i === labels.length - 1 && labels.length > 1 ? 'end' : 'middle'} fontSize={11} fill="var(--color-text-faint)">
                {l}
              </text>
            ) : null,
          )}
          {series.map((s) => (
            <path key={s.name} d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray={s.dash ? '5 4' : undefined} />
          ))}
        </svg>
      </div>
    </div>
  )
}

// ---- ledger account picker --------------------------------------------------------------------------------------------
// A searchable list of the chart of accounts; the value is the account number, as the classic picker keeps it. A number the chart does
// not list (or while the chart is still loading) stays selectable so an existing value is never lost.
export function AccountSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { data: accounts, isLoading, isError } = useLedgerAccounts()
  const options = useMemo<SearchableSelectOption[]>(() => {
    // The empty choice says why the list is empty while the chart of accounts is still on its way (or could not be read).
    const blank = isLoading ? 'Loading accounts…' : isError ? '— (accounts could not be loaded)' : '—'
    const list: SearchableSelectOption[] = [{ value: '', label: blank }, ...(accounts ?? []).map((a) => ({ value: a.number, label: `${a.number} — ${a.label}`, keywords: `${a.number} ${a.label}` }))]
    if (value && !list.some((o) => o.value === value)) list.push({ value, label: value })
    return list
  }, [accounts, value, isLoading, isError])
  return (
    <div aria-label={label}>
      <SearchableSelect value={value} onChange={onChange} options={options} placeholder="Account no. or name…" />
    </div>
  )
}

export function DynamicForm({ items, values, onChange, errors = {} }: { items: FormItem[]; values: FormValues; onChange: (key: string, value: string) => void; errors?: Record<string, string> }) {
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {items.map((i, idx) => {
        if (isSection(i)) {
          return (
            <div key={`s${idx}`} className="col-span-full mt-1 border-t border-border pt-3 text-sm font-bold text-text!">
              {i.section}
            </div>
          )
        }
        if (i.show && !i.show(values)) return null
        const v = values[i.key] ?? ''
        const err = errors[i.key]
        const common = { id: `f_${i.key}`, 'aria-label': i.label, disabled: i.disabled }
        let control: ReactNode
        if (i.type === 'select') {
          control = (
            <select {...common} value={v} onChange={(e) => onChange(i.key, e.target.value)} className={inputClasses}>
              {i.blank !== undefined && <option value="">{i.blank}</option>}
              {(i.options ?? []).map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.label}
                </option>
              ))}
            </select>
          )
        } else if (i.type === 'textarea') {
          control = <textarea {...common} value={v} rows={3} onChange={(e) => onChange(i.key, e.target.value)} className={inputClasses} />
        } else if (i.type === 'account') {
          control = <AccountSelect value={v} onChange={(x) => onChange(i.key, x)} label={i.label} />
        } else if (i.type === 'readonly') {
          control = <div className={`${inputClasses} bg-surface-hover`}>{v || '—'}</div>
        } else {
          control = (
            <input
              {...common}
              value={v}
              type={i.type === 'date' ? 'date' : i.type === 'email' ? 'email' : i.type === 'month' ? 'month' : 'text'}
              inputMode={i.type === 'num' ? 'decimal' : undefined}
              maxLength={i.max}
              placeholder={i.placeholder}
              onChange={(e) => onChange(i.key, e.target.value)}
              className={inputClasses}
            />
          )
        }
        return (
          <div key={i.key} className={`flex flex-col gap-1 ${i.full || i.type === 'textarea' ? 'col-span-full' : ''}`}>
            <label htmlFor={`f_${i.key}`} className="text-sm text-text">
              {i.label}
              {i.required && <span className="text-danger"> *</span>}
            </label>
            {control}
            {(err || i.hint) && <span className={`text-xs ${err ? 'text-danger' : 'text-text-faint'}`}>{err || i.hint}</span>}
          </div>
        )
      })}
    </div>
  )
}

// Maps a refused request onto the form: a field error under its field, anything left over in the banner line.
function applyServerErrors(items: FormItem[], e: unknown): { fields: Record<string, string>; message: string } {
  if (!(e instanceof AssetApiError)) return { fields: {}, message: e instanceof Error ? e.message : 'Could not save.' }
  const known = new Set(items.filter((i): i is FieldSpec => !isSection(i)).map((i) => i.key))
  const fields: Record<string, string> = {}
  const left: string[] = []
  for (const [k, v] of Object.entries(e.errors)) {
    const text = errorText(v)
    if (!text) continue
    if (known.has(k)) fields[k] = text
    else left.push(text)
  }
  return { fields, message: left.length ? `${e.message} — ${left.join(' ')}` : e.message }
}

// A modal with a form. onSave gets the visible values and returns a promise; a refusal stays in the dialog, field errors under their fields.
export function FormDialog({
  title,
  items,
  initial,
  okLabel = 'Save',
  intro,
  danger,
  onSave,
  onClose,
}: {
  title: string
  items: FormItem[]
  initial: FormValues
  okLabel?: string
  intro?: ReactNode
  danger?: boolean
  onSave: (values: FormValues) => Promise<unknown>
  onClose: () => void
}) {
  const [values, setValues] = useState<FormValues>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function submit() {
    const out = visibleValues(items, values)
    const missing: Record<string, string> = {}
    for (const i of items) if (!isSection(i) && i.required && i.key in out && !out[i.key]) missing[i.key] = 'Required'
    setErrors(missing)
    setMessage('')
    if (Object.keys(missing).length) return
    setBusy(true)
    try {
      await onSave(out)
      onClose()
    } catch (e) {
      const r = applyServerErrors(items, e)
      setErrors(r.fields)
      setMessage(r.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface-alt shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-base font-bold text-text!">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {intro && <div className="text-sm text-text-muted">{intro}</div>}
          {items.length > 0 && <DynamicForm items={items} values={values} onChange={(k, v) => setValues((cur) => ({ ...cur, [k]: v }))} errors={errors} />}
          {message && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              {message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <button type="button" onClick={onClose} disabled={busy} className={GHOST_BTN}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className={danger ? DANGER_BTN : PRIMARY_BTN}>
            {busy && <Loader2 size={14} className="animate-spin" />} {okLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- the in-page tab strip of the classic asset pages ------------------------------------------------------------------
// Every classic asset page opens with one: "Fixed assets" (Assets, + New asset, Depreciation run, Reports, Setup) on the main pages and the
// asset card, "Asset setup" (types, categories, groups, Insurance companies) on the four setup pages. Wording as on the classic page.
export type AssetNavKey = 'list' | 'new' | 'depreciation' | 'reports' | 'types' | 'categories' | 'groups' | 'insurers'

const MAIN_TABS: Array<[string, string, string]> = [
  ['list', 'Assets', ROUTES.fixedAssetList],
  ['new', '+ New asset', ROUTES.fixedAssetNew],
  ['depreciation', 'Depreciation run', ROUTES.fixedAssetDepreciation],
  ['reports', 'Reports', ROUTES.fixedAssetReports],
  ['setup', 'Setup', ROUTES.fixedAssetTypes],
]
const SETUP_TABS: Array<[string, string, string]> = [
  ['types', 'types', ROUTES.fixedAssetTypes],
  ['categories', 'categories', ROUTES.fixedAssetCategory],
  ['groups', 'groups', ROUTES.fixedAssetGroup],
  ['insurers', 'Insurance companies', ROUTES.fixedAssetInsuranceCompany],
]

export function AssetSubNav({ group, active }: { group: 'main' | 'setup'; active?: AssetNavKey }) {
  const label = group === 'main' ? 'Fixed assets' : 'Asset setup'
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-alt p-1.5">
      <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      {(group === 'main' ? MAIN_TABS : SETUP_TABS).map(([key, text, to]) => (
        <Link key={key} to={to} data-keep-visible aria-current={active === key ? 'page' : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active === key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}>
          {text}
        </Link>
      ))}
    </nav>
  )
}
