import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { CheckCircle2, Eye, Info, Loader2, Lock, Tag, Wand2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { useCategories } from '../../customers/categories.queries'
import { formatMoney } from '../../../utils/format'
import type { BulkFilters, BulkPriceInput, BulkPriceMode, BulkPriceResult, BulkResultCounts, BulkRowStatus } from '../../../api/products'
import { useBulkPriceInfo, useRunBulkPrice } from '../productTools.queries'
import { LegacyErrorCard, LegacyLoadingCard } from './LegacyReportStates'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

// Both tools are product/fapi endpoints that are a dry run until confirm:true,
// need at least one filter (there is deliberately no way to hit every product by
// leaving the form blank) and cap at max_rows per call. "Preview" is the dry
// run; "Apply" re-sends exactly the previewed request with confirm:true, and is
// only enabled while the form still matches what was previewed.

interface FilterForm {
  categ: number
  type: '' | '0' | '1'
  refLike: string
}

const EMPTY_FILTERS: FilterForm = { categ: 0, type: '', refLike: '' }

export function bulkFilters(f: FilterForm): BulkFilters {
  const out: BulkFilters = {}
  if (f.categ > 0) out.categ = f.categ
  if (f.type !== '') out.type = Number(f.type) as 0 | 1
  if (f.refLike.trim()) out.ref_like = f.refLike.trim()
  return out
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-faint">{label}</span>
      {children}
      {hint && <span className="text-xs text-text-faint">{hint}</span>}
    </label>
  )
}

function FiltersCard({ value, onChange, extra }: { value: FilterForm; onChange: (next: FilterForm) => void; extra?: ReactNode }) {
  const { data: categories } = useCategories(0)
  return (
    <Card className="!h-auto">
      <p className="mb-3 text-sm font-semibold text-text!">Which products</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tag/category">
          <select value={value.categ} onChange={(e) => onChange({ ...value, categ: Number(e.target.value) })} className={inputCls}>
            <option value={0}>Any tag</option>
            {(categories?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullLabel}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as FilterForm['type'] })} className={inputCls}>
            <option value="">Any type</option>
            <option value="0">Products</option>
            <option value="1">Services</option>
          </select>
        </Field>
        <Field label="Ref contains">
          <input value={value.refLike} onChange={(e) => onChange({ ...value, refLike: e.target.value })} className={inputCls} placeholder="e.g. 100" />
        </Field>
        {extra}
      </div>
      <p className="mt-3 text-xs text-text-faint">Pick at least one filter. To change every product, choose Type: Products (or Services).</p>
    </Card>
  )
}

const STATUS_TONE: Record<string, string> = {
  would_change: 'bg-brand/10 text-brand',
  changed: 'bg-success-bg text-success-fg',
  unchanged: 'bg-surface-hover text-text-muted',
  skipped_no_cost: 'bg-warning-bg text-warning-fg',
  refused_negative: 'bg-warning-bg text-warning-fg',
  error: 'bg-danger-bg text-danger-fg',
}

export function StatusBadge({ status }: { status: BulkRowStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? 'bg-surface-hover text-text-muted'}`}>{status.replace(/_/g, ' ')}</span>
}

export function Summary({ result }: { result: BulkResultCounts }) {
  const chips: [string, number][] = result.dry_run
    ? [
        ['Matched', result.matched],
        ['Would change', result.would_change],
        ['Unchanged / skipped', result.skipped],
        ['Failed', result.failed],
      ]
    : [
        ['Matched', result.matched],
        ['Changed', result.changed],
        ['Unchanged / skipped', result.skipped],
        ['Failed', result.failed],
      ]
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${result.dry_run ? 'text-text!' : 'text-success-fg'}`}>
        {result.dry_run ? <Eye size={16} className="text-brand" /> : <CheckCircle2 size={16} />}
        {result.dry_run ? 'Preview — nothing has been written yet' : 'Applied'}
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(([label, n]) => (
          <span key={label} className="rounded-md border border-border bg-surface-alt px-3 py-1 text-sm text-text">
            {label}: <strong className="tabular-nums">{n}</strong>
          </span>
        ))}
      </div>
      {result.matched >= result.max_rows && <p className="text-xs text-warning-fg">At most {result.max_rows} products go in one run — narrow the filters to cover the rest.</p>}
    </div>
  )
}

function ApplyBar({ canApply, reason, pending, onPreview, onApply, previewing }: { canApply: boolean; reason: string; pending: boolean; previewing: boolean; onPreview: () => void; onApply: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onPreview} disabled={previewing || pending} className="inline-flex items-center gap-1.5 rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-60">
        {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Preview changes
      </button>
      <button
        type="button"
        onClick={onApply}
        disabled={!canApply || pending || previewing}
        title={canApply ? undefined : reason}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Apply
      </button>
      {!canApply && reason && <span className="text-xs text-text-faint">{reason}</span>}
    </div>
  )
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

// Why Apply is disabled, or '' when it is enabled.
export function applyBlockReason(opts: { canWrite: boolean; preview: BulkResultCounts | null; previewKey: string | null; currentKey: string }): string {
  if (!opts.canWrite) return 'You are not allowed to change product prices.'
  if (!opts.preview || opts.previewKey !== opts.currentKey) return 'Preview first — Apply runs exactly what was previewed.'
  if (opts.preview.would_change === 0) return 'The preview has nothing to change.'
  return ''
}

// ── Bulk price update (product/fapi/bulk_price.php) ────────────
// percent / amount / set / margin_on_cost (price = recorded cost plus a
// mark-up). A product with no cost is skipped and named rather than priced at
// zero; a resulting negative price is refused for that row, never clamped.
const MODE_LABEL: Record<string, string> = { percent: 'Percentage', amount: 'Fixed amount', set: 'Set price', margin_on_cost: 'Margin on cost' }
const VALUE_LABEL: Record<BulkPriceMode, string> = { percent: 'Change (%)', amount: 'Amount to add (negative to subtract)', set: 'New price', margin_on_cost: 'Mark-up on cost (%)' }

export function ProductBulkPricePage() {
  const confirm = useConfirm()
  const { data: info, isLoading, isError, error, refetch } = useBulkPriceInfo()
  const run = useRunBulkPrice()
  const [filters, setFilters] = useState<FilterForm>(EMPTY_FILTERS)
  const [mode, setMode] = useState<BulkPriceMode>('percent')
  const [value, setValue] = useState('')
  const [priceBase, setPriceBase] = useState<'' | 'HT' | 'TTC'>('')
  const [round, setRound] = useState(2)
  const [level, setLevel] = useState(1)
  const [result, setResult] = useState<BulkPriceResult | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [runError, setRunError] = useState('')
  const [applying, setApplying] = useState(false)

  const numeric = value.trim() === '' ? NaN : Number(value)
  const input: BulkPriceInput | null = Number.isFinite(numeric)
    ? { mode, value: numeric, round, ...(priceBase ? { price_base: priceBase } : {}), ...(info?.multiprices ? { level } : {}), ...bulkFilters(filters) }
    : null
  const currentKey = JSON.stringify(input)
  const hasFilter = !!input && (input.categ !== undefined || input.type !== undefined || !!input.ref_like)

  function preview() {
    setRunError('')
    if (!input) return setRunError('Enter a value.')
    if (!hasFilter) return setRunError('Pick at least one filter.')
    run.mutate(
      { input, confirm: false },
      {
        onSuccess: (r) => {
          setResult(r)
          setPreviewKey(currentKey)
        },
        onError: (e) => setRunError(errorText(e, 'The preview failed.')),
      },
    )
  }

  async function apply() {
    if (!input || !result) return
    const ok = await confirm({
      title: 'Apply the price update?',
      message: `Change the selling price of ${result.would_change} product(s)?`,
      warningTitle: 'This changes live product prices.',
      warningMessage: 'Every changed product gets a new price log line. There is no undo button.',
      confirmLabel: 'Apply',
      variant: 'default',
    })
    if (!ok) return
    setRunError('')
    setApplying(true)
    run.mutate(
      { input, confirm: true },
      {
        onSuccess: (r) => {
          setResult(r)
          setPreviewKey(null)
        },
        onError: (e) => setRunError(errorText(e, 'The price update failed.')),
        onSettled: () => setApplying(false),
      },
    )
  }

  const reason = applyBlockReason({ canWrite: !!info?.can_write, preview: result?.dry_run ? result : null, previewKey, currentKey })
  const modes = info ? (Object.entries(info.modes) as [BulkPriceMode, string][]) : []

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Tag size={20} className="text-brand" /> Bulk Price Update
        <Link to={ROUTES.productPriceUpdate} className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Product Price Update
        </Link>
      </h2>
      <div className="flex items-start gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-text">
        <Info size={15} className="mt-0.5 shrink-0 text-brand" />
        <p>
          Changes the selling price of every product matching the filters{info ? ` (${info.product_count} products in the catalogue, at most ${info.max_rows} per run)` : ''}. Prices are written through the
          product's own price update, so the incl.-tax price and the price log follow.
        </p>
      </div>

      {isError && <LegacyErrorCard title="Couldn't load the price update options" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading…" />}

      {info && (
        <>
          <Card className="!h-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Mode" hint={info.modes[mode]}>
                <select value={mode} onChange={(e) => setMode(e.target.value as BulkPriceMode)} className={inputCls}>
                  {modes.map(([key]) => (
                    <option key={key} value={key}>
                      {MODE_LABEL[key] ?? key}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={VALUE_LABEL[mode]}>
                <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Price base">
                <select value={priceBase} onChange={(e) => setPriceBase(e.target.value as '' | 'HT' | 'TTC')} className={inputCls}>
                  <option value="">Each product's own base</option>
                  <option value="HT">Excl. tax (HT)</option>
                  <option value="TTC">Incl. tax (TTC)</option>
                </select>
              </Field>
              <Field label="Round to decimals">
                <select value={round} onChange={(e) => setRound(Number(e.target.value))} className={inputCls}>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              {info.multiprices && (
                <Field label="Price level">
                  <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={inputCls}>
                    {Array.from({ length: info.price_levels }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Level {n}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </Card>

          <FiltersCard value={filters} onChange={setFilters} />

          <ApplyBar canApply={!reason} reason={reason} pending={applying} previewing={run.isPending && !applying} onPreview={preview} onApply={() => void apply()} />
          {runError && <p className="text-sm font-medium text-danger">{runError}</p>}

          {result && (
            <Card className="!h-auto space-y-3">
              <Summary result={result} />
              <div className="overflow-auto max-h-[60vh] rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-3 py-2">Product</th>
                      <th className="font-medium px-3 py-2">Base</th>
                      <th className="font-medium px-3 py-2 text-right">Price</th>
                      <th className="font-medium px-3 py-2 text-right">Cost used</th>
                      <th className="font-medium px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.id} className="border-b border-border">
                        <td className="px-3 py-2">
                          <span className="font-medium text-text!">{r.ref}</span> <span className="text-text-muted">{r.label}</span>
                        </td>
                        <td className="px-3 py-2">{r.price_base}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatMoney(r.price_from)} → {r.price_to === null ? '—' : formatMoney(r.price_to)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.cost_used === null ? '—' : formatMoney(r.cost_used)}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                          {r.message && <span className="block text-xs text-text-faint">{r.message}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
      {info && !info.can_write && (
        <p className="flex items-center gap-1.5 text-xs text-text-faint">
          <Lock size={12} /> You can preview, but your account is not allowed to apply changes.
        </p>
      )}
    </div>
  )
}
