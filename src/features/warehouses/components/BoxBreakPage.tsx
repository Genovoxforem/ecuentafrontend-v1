import { useState } from 'react'
import {
  Box,
  Wrench,
  Layers,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Undo2,
  Lightbulb,
  PackageSearch,
  Star,
  Trash2,
  Download,
  Printer,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import {
  useBoxBreakProducts,
  useBoxBreakWarehouses,
  useBoxBreakUoms,
  useBoxBreakStock,
  useBoxBreakLots,
  useBoxBreakHistory,
  useBoxBreakTrend,
  useBoxBreakTemplates,
  useBoxBreakPending,
  useBoxBreakSuggestions,
  useBoxBreakGrnPending,
  useDoBoxBreak,
  useReverseBoxBreak,
  useApproveBoxBreak,
  useRejectBoxBreak,
  useSaveBoxBreakTemplate,
  useDeleteBoxBreakTemplate,
  boxBreakExportUrl,
} from '../boxBreak.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function ReasonRow({ label, onConfirm, onCancel }: { label: string; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-surface-hover">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={`Reason for ${label}…`}
        className={inputCls + ' flex-1'}
      />
      <button
        type="button"
        disabled={!reason.trim()}
        onClick={() => onConfirm(reason.trim())}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
      >
        Confirm
      </button>
      <button type="button" onClick={onCancel} className="rounded-md border border-input-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface">
        Cancel
      </button>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-danger-bg border border-danger/40 px-3 py-2 text-sm text-danger-fg">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {message}
    </div>
  )
}

function KpiCards() {
  const { data: history, isLoading } = useBoxBreakHistory({})
  const kpi = history?.kpi
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="!p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Breaks (30 Days)</p>
        <p className="text-xl font-bold text-text! mt-1">{isLoading ? <Loader2 size={18} className="animate-spin" /> : (kpi?.total_breaks ?? 0)}</p>
        <p className="text-xs text-text-faint mt-0.5">total breaks</p>
      </Card>
      <Card className="!p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Boxes Broken (30d)</p>
        <p className="text-xl font-bold text-text! mt-1">{isLoading ? <Loader2 size={18} className="animate-spin" /> : (kpi?.total_boxes ?? 0)}</p>
        <p className="text-xs text-text-faint mt-0.5">packs processed</p>
      </Card>
      <Card className="!p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Units Created (30d)</p>
        <p className="text-xl font-bold text-text! mt-1">{isLoading ? <Loader2 size={18} className="animate-spin" /> : (kpi?.total_units ?? 0)}</p>
        <p className="text-xs text-text-faint mt-0.5">individual units</p>
      </Card>
    </div>
  )
}

function PendingApprovalsCard() {
  const { data, isLoading } = useBoxBreakPending()
  const approve = useApproveBoxBreak()
  const reject = useRejectBoxBreak()
  const [rejectingId, setRejectingId] = useState<number | null>(null)

  const pending = data?.pending ?? []
  if (!isLoading && pending.length === 0) return null

  return (
    <Card className="!h-auto">
      <h3 className="flex items-center gap-2 text-base font-semibold text-text! mb-3">
        <AlertTriangle size={16} className="text-warning-fg" /> Pending Approval {data ? `(${data.count})` : ''}
      </h3>
      {isLoading ? (
        <p className="text-sm text-text-faint flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </p>
      ) : (
        <div className="space-y-2">
          {pending.map((p) => (
            <div key={p.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-semibold text-text!">{p.ref}</span> — {p.product_ref} ({p.product_label}) at {p.warehouse_ref}
                  <div className="text-xs text-text-muted mt-0.5">
                    {p.qty_broken} {p.uom_from} → {p.qty_produced} {p.uom_to}
                    {p.lot_number ? ` · Lot ${p.lot_number}` : ''} · by {p.author ?? 'unknown'} on {p.date}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approve.mutate({ bb_id: p.id })}
                    disabled={approve.isPending}
                    className="flex items-center gap-1 rounded-md bg-success-bg px-2.5 py-1.5 text-xs font-medium text-success-fg hover:opacity-80 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectingId(p.id)}
                    className="flex items-center gap-1 rounded-md bg-danger-bg px-2.5 py-1.5 text-xs font-medium text-danger-fg hover:opacity-80"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
              {rejectingId === p.id && (
                <ReasonRow
                  label="rejection"
                  onCancel={() => setRejectingId(null)}
                  onConfirm={(reason) => {
                    reject.mutate({ bb_id: p.id, reason })
                    setRejectingId(null)
                  }}
                />
              )}
              {approve.isError && approve.variables?.bb_id === p.id && <div className="mt-2"><ErrorBanner message={(approve.error as Error).message} /></div>}
              {reject.isError && reject.variables?.bb_id === p.id && <div className="mt-2"><ErrorBanner message={(reject.error as Error).message} /></div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function SuggestionsCard({ onApply }: { onApply: (s: { productId: number; warehouseId: number }) => void }) {
  const { data, isLoading } = useBoxBreakSuggestions()
  if (!isLoading && (data?.length ?? 0) === 0) return null
  return (
    <Card className="!h-auto">
      <h3 className="flex items-center gap-2 text-base font-semibold text-text! mb-3">
        <Lightbulb size={16} className="text-brand" /> Auto-Break Suggestions
      </h3>
      <p className="text-xs text-text-faint mb-2">Products below their minimum stock that have a multi-UOM config available to break.</p>
      {isLoading ? (
        <Loader2 size={16} className="animate-spin text-brand" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s) => (
            <div key={`${s.product_id}-${s.warehouse_id}`} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
              <span className="text-text!">
                {s.product_ref} — {s.product_label} at {s.warehouse_ref}: {s.current_stock}/{s.min_stock} base units, suggest breaking {s.suggested_break} × {s.break_uom}
              </span>
              <button
                type="button"
                onClick={() => onApply({ productId: s.product_id, warehouseId: s.warehouse_id })}
                className="shrink-0 rounded-md border border-input-border px-2.5 py-1 text-xs font-medium text-brand hover:bg-surface-hover"
              >
                Use in form
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function GrnPendingCard({ onApply }: { onApply: (s: { productId: number; warehouseId: number }) => void }) {
  const { data, isLoading } = useBoxBreakGrnPending()
  if (!isLoading && (data?.length ?? 0) === 0) return null
  return (
    <Card className="!h-auto">
      <h3 className="flex items-center gap-2 text-base font-semibold text-text! mb-3">
        <PackageSearch size={16} className="text-brand" /> Recent Goods Received — May Need Breaking
      </h3>
      {isLoading ? (
        <Loader2 size={16} className="animate-spin text-brand" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((g) => (
            <div key={g.grn_id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
              <span className="text-text!">
                {g.grn_no} — {g.product_ref} ({g.product_name}): {g.qty_bags} bags × {g.qty_per_bag} at {g.warehouse_ref} on {g.date}
              </span>
              <button
                type="button"
                onClick={() => onApply({ productId: g.product_id, warehouseId: g.warehouse_id })}
                className="shrink-0 rounded-md border border-input-border px-2.5 py-1 text-xs font-medium text-brand hover:bg-surface-hover"
              >
                Use in form
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

interface FormState {
  productId: number | undefined
  warehouseId: number | undefined
  uomFrom: string
  uomTo: string
  qtyBreak: string
  lotNumber: string
  note: string
  cascade: boolean
}
const emptyForm: FormState = { productId: undefined, warehouseId: undefined, uomFrom: '', uomTo: '', qtyBreak: '1', lotNumber: '', note: '', cascade: true }

function PerformBreakForm({ prefill, onDone }: { prefill: { productId: number; warehouseId: number } | null; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [lastResult, setLastResult] = useState<{ ref: string; qty_broken: number; uom_from: string; qty_produced: number; uom_to: string; labels_url?: string; msg?: string } | null>(null)

  if (prefill && prefill.productId !== form.productId) {
    setForm({ ...emptyForm, productId: prefill.productId, warehouseId: prefill.warehouseId })
    setLastResult(null)
  }

  const { data: products } = useBoxBreakProducts()
  const { data: warehouses } = useBoxBreakWarehouses()
  const { data: uoms } = useBoxBreakUoms(form.productId)
  const { data: stock, isLoading: stockLoading } = useBoxBreakStock(form.productId, form.warehouseId, form.uomFrom)
  const { data: lots } = useBoxBreakLots(form.productId, form.warehouseId)
  const doBreak = useDoBoxBreak()
  const saveTemplate = useSaveBoxBreakTemplate()
  const { data: templates } = useBoxBreakTemplates()
  const deleteTemplate = useDeleteBoxBreakTemplate()

  const fromUom = (uoms ?? []).find((u) => u.label === form.uomFrom)
  const smallerUoms = (uoms ?? []).filter((u) => fromUom && u.qty < fromUom.qty)
  const qtyPer = fromUom?.qty ?? 0

  const productOptions = (products ?? []).map((p) => ({ value: String(p.id), label: `${p.ref} — ${p.label}`, keywords: p.ref, description: p.uom_count > 0 ? `${p.uom_count} UOM configured` : 'No UOM configured' }))
  const warehouseOptions = (warehouses ?? []).map((w) => ({ value: String(w.id), label: w.description ? `${w.ref} — ${w.description}` : w.ref }))

  const productValid = !!form.productId
  const canPickUom = productValid && (uoms?.length ?? 0) > 0
  const readyToSubmit = productValid && !!form.warehouseId && !!form.uomFrom && !!form.uomTo.trim() && Number(form.qtyBreak) > 0 && qtyPer > 0

  function handleBreak() {
    if (!form.productId || !form.warehouseId) return
    setLastResult(null)
    doBreak.mutate(
      {
        fk_product: form.productId,
        fk_entrepot: form.warehouseId,
        uom_from: form.uomFrom,
        uom_to: form.uomTo.trim(),
        qty_break: Number(form.qtyBreak),
        qty_per: qtyPer,
        note: form.note || undefined,
        lot_number: form.lotNumber || undefined,
        cascade: form.cascade,
      },
      {
        onSuccess: (res) => {
          setLastResult({
            ref: res.ref,
            qty_broken: res.qty_broken ?? Number(form.qtyBreak),
            uom_from: res.uom_from ?? form.uomFrom,
            qty_produced: res.qty_produced ?? 0,
            uom_to: res.uom_to ?? form.uomTo,
            labels_url: res.labels_url,
            msg: res.msg,
          })
          setForm((f) => ({ ...f, qtyBreak: '1', lotNumber: '', note: '' }))
          onDone()
        },
      },
    )
  }

  function handleSaveTemplate() {
    if (!form.productId || !form.warehouseId || !form.uomFrom || !form.uomTo.trim()) return
    const name = `${form.uomFrom} → ${form.uomTo.trim()} (${productOptions.find((p) => p.value === String(form.productId))?.label ?? form.productId})`
    saveTemplate.mutate({
      name,
      fk_product: form.productId,
      fk_entrepot: form.warehouseId,
      uom_from: form.uomFrom,
      uom_to: form.uomTo.trim(),
      qty_per: qtyPer,
      qty_break_default: Number(form.qtyBreak) || 1,
    })
  }

  function applyTemplate(t: NonNullable<typeof templates>[number]) {
    setForm({
      productId: t.fk_product,
      warehouseId: t.fk_entrepot,
      uomFrom: t.uom_from,
      uomTo: t.uom_to,
      qtyBreak: String(t.qty_break_default || 1),
      lotNumber: '',
      note: '',
      cascade: true,
    })
    setLastResult(null)
  }

  return (
    <Card className="!h-auto">
      <h3 className="flex items-center gap-2 text-base font-semibold text-text! mb-4">
        <Wrench size={16} className="text-brand" /> Perform Box Break
      </h3>

      {(templates?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-faint">Templates:</span>
          {templates!.map((t) => (
            <span key={t.id} className="flex items-center gap-1 rounded-full border border-input-border pl-2.5 pr-1 py-1 text-xs">
              <button type="button" onClick={() => applyTemplate(t)} className="text-text hover:text-brand">
                {t.name}
              </button>
              <button type="button" onClick={() => deleteTemplate.mutate(t.id)} className="p-0.5 text-text-faint hover:text-danger-fg">
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
        <div>
          <label className="block text-sm mb-1 text-danger">Product*</label>
          <SearchableSelect
            value={form.productId ? String(form.productId) : ''}
            onChange={(v) => setForm({ ...emptyForm, productId: Number(v), warehouseId: form.warehouseId })}
            options={productOptions}
            placeholder="Search product…"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-danger">Warehouse*</label>
          <SearchableSelect value={form.warehouseId ? String(form.warehouseId) : ''} onChange={(v) => setForm((f) => ({ ...f, warehouseId: Number(v) }))} options={warehouseOptions} placeholder="Select…" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-danger">Break FROM*</label>
          <select
            value={form.uomFrom}
            onChange={(e) => setForm((f) => ({ ...f, uomFrom: e.target.value, uomTo: '' }))}
            className={inputCls + ' w-full appearance-none'}
            disabled={!canPickUom}
          >
            <option value="">{canPickUom ? '-- Select --' : 'No UOM configured for this product'}</option>
            {(uoms ?? []).map((u) => (
              <option key={u.label} value={u.label}>
                {u.full_label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 text-danger">Break INTO*</label>
          <input
            list="box-break-into-options"
            value={form.uomTo}
            onChange={(e) => setForm((f) => ({ ...f, uomTo: e.target.value }))}
            placeholder={smallerUoms.length ? 'e.g. ' + smallerUoms[0].label : 'e.g. Unit, Piece…'}
            className={inputCls + ' w-full'}
            disabled={!form.uomFrom}
          />
          <datalist id="box-break-into-options">
            {smallerUoms.map((u) => (
              <option key={u.label} value={u.label} />
            ))}
          </datalist>
          {form.uomFrom && smallerUoms.length === 0 && <p className="text-[11px] text-text-faint mt-1">No smaller UOM is configured — type the resulting unit's name freely.</p>}
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Base units per {form.uomFrom || 'FROM unit'}</label>
          <input value={qtyPer || ''} disabled placeholder="auto-filled from UOM config" className={inputCls + ' w-full opacity-70 cursor-not-allowed'} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-danger">How many {form.uomFrom || 'units'} to break*</label>
          <input value={form.qtyBreak} onChange={(e) => setForm((f) => ({ ...f, qtyBreak: e.target.value }))} className={inputCls + ' w-full'} />
          {form.productId && form.warehouseId && form.uomFrom && (
            <p className="text-[11px] text-text-faint mt-1">
              {stockLoading ? 'Checking stock…' : stock ? `Available: ${stock.display}` : ''}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Lot / Batch No.</label>
          <input
            list="box-break-lot-options"
            value={form.lotNumber}
            onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))}
            placeholder="Optional — inherited by units"
            className={inputCls + ' w-full'}
          />
          <datalist id="box-break-lot-options">
            {(lots ?? []).map((l) => (
              <option key={l.batch} value={l.batch}>
                {l.expiry_date ? `expires ${l.expiry_date}${l.urgent ? ' — urgent' : ''}` : ''}
              </option>
            ))}
          </datalist>
          {(lots?.some((l) => l.urgent)) && <p className="text-[11px] text-warning-fg mt-1">FEFO: oldest lot expires within 30 days — consider using it first.</p>}
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <label className="block text-sm mb-1 text-text-muted">Note</label>
          <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Optional reason / reference" className={inputCls + ' w-full'} />
        </div>
      </div>

      <label className="flex items-center gap-2 mt-3 text-sm text-text!">
        <input type="checkbox" checked={form.cascade} onChange={(e) => setForm((f) => ({ ...f, cascade: e.target.checked }))} className="text-brand focus:ring-brand/30" />
        <span className="font-semibold">Cascade Break</span> — record the intermediate UOM chain in the audit trail when FROM/INTO span more than one step
      </label>

      {doBreak.isError && (
        <div className="mt-3">
          <ErrorBanner message={(doBreak.error as Error).message} />
        </div>
      )}

      {lastResult && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-success-bg border border-success/40 px-3 py-2 text-sm text-success-fg">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          <div>
            {lastResult.msg ? (
              lastResult.msg
            ) : (
              <>
                {lastResult.ref}: broke {lastResult.qty_broken} {lastResult.uom_from} into {lastResult.qty_produced} {lastResult.uom_to}.
              </>
            )}
            {lastResult.labels_url && (
              <a href={lastResult.labels_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline">
                <Printer size={12} /> Print labels
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={handleBreak} disabled={!readyToSubmit || doBreak.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {doBreak.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />} Perform Box Break
        </button>
        <button
          type="button"
          onClick={handleSaveTemplate}
          disabled={!readyToSubmit || saveTemplate.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
        >
          <Star size={14} /> Save as Template
        </button>
      </div>
    </Card>
  )
}

const HISTORY_COLUMNS = ['Ref.', 'Date', 'Product', 'Warehouse', 'From', 'Into', 'Lot', 'By', 'Status', 'Actions']

function HistoryTable() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data, isLoading, isError, error } = useBoxBreakHistory({ page, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  const reverse = useReverseBoxBreak()
  const [reversingId, setReversingId] = useState<number | null>(null)

  const rows = data?.rows ?? []

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <h3 className="flex items-center gap-2 text-base font-semibold text-text!">
          <Layers size={16} className="text-brand" /> Break History
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-text-faint">
            From
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className={inputCls} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-faint">
            To
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className={inputCls} />
          </label>
          <a
            href={boxBreakExportUrl({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}
            className="flex items-center gap-1.5 rounded-lg border border-input-border px-3 py-2 text-xs font-medium text-text-muted hover:bg-surface-hover"
          >
            <Download size={13} /> Export CSV
          </a>
        </div>
      </div>

      {isError && (
        <div className="p-4">
          <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load history.'} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              {HISTORY_COLUMNS.map((c) => (
                <Th key={c} className="whitespace-nowrap">{c}</Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={HISTORY_COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                  <Loader2 size={16} className="inline animate-spin mr-2" /> Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={HISTORY_COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                  No box breaks recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <>
                  <tr key={r.id} className="border-b border-border hover:bg-surface-hover">
                    <td className="px-3 py-2 text-text!">{r.ref}</td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {r.product_ref} <span className="text-text-faint">— {r.product_label}</span>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{r.warehouse_ref}</td>
                    <td className="px-3 py-2 text-text!">{r.qty_broken} {r.uom_from}</td>
                    <td className="px-3 py-2 text-text!">{r.qty_produced} {r.uom_to}</td>
                    <td className="px-3 py-2 text-text-muted">{r.lot_number ?? '-'}</td>
                    <td className="px-3 py-2 text-text-muted">{r.author ?? '-'}</td>
                    <td className="px-3 py-2">
                      {r.reversed ? (
                        <span className="inline-flex items-center rounded-full bg-danger-bg text-danger-fg px-2 py-0.5 text-xs font-medium">Reversed</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-success-bg text-success-fg px-2 py-0.5 text-xs font-medium">Done</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!r.reversed && (
                        <button type="button" onClick={() => setReversingId(reversingId === r.id ? null : r.id)} className="flex items-center gap-1 text-xs font-medium text-danger-fg hover:underline">
                          <Undo2 size={12} /> Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                  {reversingId === r.id && (
                    <tr>
                      <td colSpan={HISTORY_COLUMNS.length} className="px-3 pb-2">
                        <ReasonRow
                          label="reversal"
                          onCancel={() => setReversingId(null)}
                          onConfirm={(reason) => {
                            reverse.mutate({ bb_id: r.id, reason })
                            setReversingId(null)
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reverse.isError && (
        <div className="p-4">
          <ErrorBanner message={(reverse.error as Error).message} />
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
          <span className="text-text-faint">
            Page {data.page} of {data.pages} — {data.total} total
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex items-center gap-1 rounded-md border border-input-border px-2.5 py-1.5 text-xs disabled:opacity-40">
              <ChevronLeft size={13} /> Prev
            </button>
            <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="flex items-center gap-1 rounded-md border border-input-border px-2.5 py-1.5 text-xs disabled:opacity-40">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function TrendCard() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const { data, isLoading } = useBoxBreakTrend(days)
  const rows = data?.rows ?? []
  const max = Math.max(1, ...rows.map((r) => r.breaks))

  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-text!">
          <Layers size={16} className="text-brand" /> Break Trend
        </h3>
        <div className="flex rounded-lg border border-input-border overflow-hidden">
          {([7, 30, 90] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={`px-3 py-1 text-xs font-medium ${days === w ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'}`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <Loader2 size={16} className="animate-spin text-brand" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">No breaks recorded in this window.</p>
      ) : (
        <div className="flex items-end gap-1 h-28">
          {rows.map((r) => (
            <div key={r.day} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${r.day}: ${r.breaks} breaks, ${r.qty_produced} units`}>
              <div className="w-full bg-brand/70 rounded-t" style={{ height: `${(r.breaks / max) * 100}%`, minHeight: r.breaks > 0 ? 2 : 0 }} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function BoxBreakPage() {
  const [prefill, setPrefill] = useState<{ productId: number; warehouseId: number } | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Box size={20} className="text-brand" /> Box Break
      </h2>

      <div className="flex items-start gap-2 rounded-md bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="mt-0.5 shrink-0" />
        Backed by the real UOM Box Break API — every field below (stock, UOM chain, FEFO lots, history, approvals) is live data from this backend.
      </div>

      <KpiCards />
      <PendingApprovalsCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SuggestionsCard onApply={setPrefill} />
        <GrnPendingCard onApply={setPrefill} />
      </div>
      <PerformBreakForm prefill={prefill} onDone={() => setPrefill(null)} />
      <TrendCard />
      <HistoryTable />
    </div>
  )
}
