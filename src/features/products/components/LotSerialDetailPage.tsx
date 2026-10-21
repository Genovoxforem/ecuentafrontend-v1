import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Hash, Loader2, Pencil, Save, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatNumber } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import type { ProductLotItem } from '../../../api/products'
import { useProductOptions } from '../products.queries'
import { lotRowFromApi, useCreateLot, useDeleteLot, useLot, useUpdateLot } from '../productTools.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-faint">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  )
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

// Stock of one lot per warehouse; the single read's warehouse rows are read
// defensively (the list item shape was never captured live).
function lotStock(lot: ProductLotItem) {
  const rows = (lot.stock?.warehouses ?? []).map((w, i) => ({
    key: w.id ?? w.fk_entrepot ?? i,
    name: [w.ref, w.label && w.label !== w.ref ? w.label : ''].filter(Boolean).join(' — ') || `#${w.id ?? w.fk_entrepot ?? i + 1}`,
    qty: Number(w.qty ?? w.reel ?? 0),
  }))
  return { rows, total: lot.stock?.total_qty ?? rows.reduce((s, r) => s + r.qty, 0) }
}

function NewLotForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: products, isLoading: productsLoading } = useProductOptions()
  const createLot = useCreateLot()
  const [form, setForm] = useState({ product: params.get('product') ?? '', batch: '', eatby: '', sellby: '' })
  const [error, setError] = useState('')

  function submit() {
    if (!form.product || !form.batch.trim()) {
      setError('Product and lot/serial number are required.')
      return
    }
    setError('')
    createLot.mutate(
      { product: Number(form.product), batch: form.batch.trim(), eatby: form.eatby || undefined, sellby: form.sellby || undefined },
      {
        onSuccess: (lot) => navigate(lot?.id ? ROUTES.productLotSerialDetail.replace(':id', String(lot.id)) : ROUTES.lotsSerials),
        onError: (e) => setError(errorText(e, 'Could not create the lot/serial.')),
      },
    )
  }

  return (
    <Card className="!h-auto max-w-2xl">
      {error && <p className="mb-3 text-sm font-medium text-danger">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product" required>
          <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={inputCls} disabled={productsLoading}>
            <option value="">{productsLoading ? 'Loading…' : 'Select a product'}</option>
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.ref} — {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lot/Serial number" required>
          <input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Eat-by date">
          <input type="date" value={form.eatby} onChange={(e) => setForm({ ...form, eatby: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Sell-by date">
          <input type="date" value={form.sellby} onChange={(e) => setForm({ ...form, sellby: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-text-faint">Only a product managed by lot or serial number can have lots.</p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={submit} disabled={createLot.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {createLot.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create
        </button>
        <Link to={ROUTES.lotsSerials} className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-hover">
          Cancel
        </Link>
      </div>
    </Card>
  )
}

function LotCard({ id }: { id: string }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { data: lot, isLoading, isError, error, refetch } = useLot(id)
  const updateLot = useUpdateLot()
  const deleteLot = useDeleteLot()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ batch: '', eatby: '', sellby: '' })
  const [actionError, setActionError] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading the lot/serial…" />
  if (isError || !lot) return <LegacyErrorCard title="Couldn't load this lot/serial" message={errorText(error, 'Lot not found.')} onRetry={() => refetch()} />

  const row = lotRowFromApi(lot)
  const stock = lotStock(lot)
  const dateValue = (v: string) => (ISO_DATE.test(v) ? v : '')

  function startEdit() {
    setActionError('')
    setForm({ batch: row.batch, eatby: dateValue(row.eatBy), sellby: dateValue(row.sellBy) })
    setEditing(true)
  }

  function save() {
    if (!form.batch.trim()) {
      setActionError('The lot/serial number is required.')
      return
    }
    // Only what changed: renaming a lot that holds stock is refused (409), so an
    // unchanged batch is never sent. A cleared date is sent as '' to clear it.
    const fields: { batch?: string; eatby?: string; sellby?: string } = {}
    if (form.batch.trim() !== row.batch) fields.batch = form.batch.trim()
    if (form.eatby !== dateValue(row.eatBy)) fields.eatby = form.eatby
    if (form.sellby !== dateValue(row.sellBy)) fields.sellby = form.sellby
    if (Object.keys(fields).length === 0) {
      setEditing(false)
      return
    }
    setActionError('')
    updateLot.mutate({ id: lot!.id, fields }, { onSuccess: () => setEditing(false), onError: (e) => setActionError(errorText(e, 'Could not update the lot/serial.')) })
  }

  async function remove() {
    const ok = await confirm({
      title: 'Delete lot/serial?',
      message: `Delete lot/serial "${row.batch}"?`,
      warningMessage:
        stock.total > 0
          ? `${formatNumber(stock.total)} unit(s) are still stocked under this lot. The quantities stay in the warehouses, but they lose this lot's dates.`
          : 'The lot and its dates are removed permanently.',
    })
    if (!ok) return
    setActionError('')
    deleteLot.mutate({ id: lot!.id, confirm: stock.total > 0 }, { onSuccess: () => navigate(ROUTES.lotsSerials), onError: (e) => setActionError(errorText(e, 'Could not delete the lot/serial.')) })
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {actionError && <p className="text-sm font-medium text-danger">{actionError}</p>}
      <Card className="!h-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-text!">{row.batch}</h3>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button type="button" onClick={save} disabled={updateLot.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                  {updateLot.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover">
                  <X size={14} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover">
                  <Pencil size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={deleteLot.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger-bg disabled:opacity-60"
                >
                  {deleteLot.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                </button>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product">
            {row.productId ? (
              <Link to={ROUTES.productDetail.replace(':id', row.productId)} className="text-sm text-brand hover:underline">
                {[row.productRef, row.productLabel].filter(Boolean).join(' — ') || `#${row.productId}`}
              </Link>
            ) : (
              <span className="text-sm text-text!">{row.productLabel || '—'}</span>
            )}
          </Field>
          <Field label="Lot/Serial number" required={editing}>
            {editing ? <input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className={inputCls} /> : <span className="text-sm text-text!">{row.batch}</span>}
          </Field>
          <Field label="Eat-by date">
            {editing ? <input type="date" value={form.eatby} onChange={(e) => setForm({ ...form, eatby: e.target.value })} className={inputCls} /> : <span className="text-sm text-text!">{row.eatBy || '—'}</span>}
          </Field>
          <Field label="Sell-by date">
            {editing ? <input type="date" value={form.sellby} onChange={(e) => setForm({ ...form, sellby: e.target.value })} className={inputCls} /> : <span className="text-sm text-text!">{row.sellBy || '—'}</span>}
          </Field>
          {row.created && (
            <Field label="Created">
              <span className="text-sm text-text!">{row.created}</span>
            </Field>
          )}
          {row.expired !== null && (
            <Field label="Status">
              <span className={`w-fit rounded px-2 py-0.5 text-xs font-medium ${row.expired ? 'bg-danger-bg text-danger-fg' : 'bg-success-bg text-success-fg'}`}>{row.expired ? 'Expired' : 'In date'}</span>
            </Field>
          )}
        </div>
        {editing && stock.total > 0 && <p className="mt-3 text-xs text-text-faint">This lot holds stock, so its number cannot be changed — move the stock out first. The dates can be changed.</p>}
      </Card>

      <Card className="!p-0 !h-auto overflow-hidden">
        <p className="px-4 py-2.5 text-sm font-semibold text-text! border-b border-border">Stock by warehouse</p>
        <table className="w-full text-sm">
          <tbody>
            {stock.rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-text-faint italic">No stock under this lot.</td>
              </tr>
            ) : (
              stock.rows.map((w) => (
                <tr key={w.key} className="border-b border-border">
                  <td className="px-4 py-2.5 text-text!">{w.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatNumber(w.qty)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-surface-alt font-medium text-text!">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(stock.total)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  )
}

// One lot/serial — product/stock/fapi/lots.php?id= and its create / update /
// delete (the classic productlot_card.php never wired its form up, so this page
// used to be inert). /products/lot-serials/new is the create form.
export function LotSerialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Link to={ROUTES.lotsSerials} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-brand">
          <ArrowLeft size={14} /> Lots/Serials
        </Link>
      </div>
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Hash size={20} className="text-brand" /> {isNew ? 'New lot/serial' : 'Lot/Serial'}
      </h2>
      {isNew ? <NewLotForm /> : <LotCard id={id!} />}
    </div>
  )
}
