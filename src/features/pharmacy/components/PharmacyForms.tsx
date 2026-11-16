import { useEffect, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { kwacha } from '../pharmacyFormat'
import { PharmacyApiError } from '../pharmacy.api'
import { saveGrn, saveMedicine, saveRx, type GrnLineInput, type MedicineForm, type RxItemInput } from '../pharmacy.actions'
import { usePharmacyMedicineSearch, usePharmacyUnits, type PharmacyMedicine, type PharmacyMedicineDetail } from '../pharmacy.queries'
import { pharmacyToast } from '../pharmacyToast'
import { Pill } from './PharmacyUi'

// The classic "sheet": a modal panel with a title, a body and a Cancel / primary footer.
export function Sheet({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[8vh]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[84vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-alt ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-serif text-xl font-bold text-text!">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-muted hover:bg-surface-hover">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export const FIELD = 'h-9 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const CELL = 'h-8 rounded-md border border-input-border bg-input-bg px-2 text-sm text-text outline-none'

export function Labeled({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-faint">{label}</span>
      {children}
    </label>
  )
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-(--color-brand) px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
      {children}
    </button>
  )
}
export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-text hover:bg-surface-hover">
      Cancel
    </button>
  )
}

// "Add medicine": type 2+ characters, pick from the pos.php medicine_search matches (Rx / OTC, generic, price).
function MedicinePicker({ label, onPick }: { label: string; onPick: (m: PharmacyMedicine) => void }) {
  const [text, setText] = useState('')
  const [term, setTerm] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 250)
    return () => clearTimeout(t)
  }, [text])
  const { data } = usePharmacyMedicineSearch(term, 2)
  const options = text.trim().length >= 2 ? (data ?? []).slice(0, 6) : []
  return (
    <div className="relative col-span-2">
      <Labeled label={label} full>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type to search…" autoComplete="off" className={`${FIELD} pl-9`} />
        </div>
      </Labeled>
      {options.length > 0 && (
        <div className="absolute inset-x-0 z-10 mt-1 overflow-hidden rounded-lg border border-border bg-surface-alt shadow-lg">
          {options.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(m)
                setText('')
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-hover"
            >
              <span className="min-w-0">
                <b className="text-text!">{m.label}</b>{' '}
                {m.rx_only || m.schedule_class ? <Pill tone="bad" dot={false}>Rx {m.schedule_class ?? ''}</Pill> : <Pill tone="ok" dot={false}>OTC</Pill>}
                <span className="block truncate text-xs text-text-faint">{m.generic ?? ''}</span>
              </span>
              <span className="font-semibold tabular-nums">{kwacha(m.price_ttc)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const failMsg = (e: unknown, fallback: string) => (e instanceof PharmacyApiError ? e.message : fallback)

// pos.php save_rx: prescriber, licence, note and the medication lines; saved as a draft for a pharmacist to verify.
export function CaptureRxSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [prescriber, setPrescriber] = useState('')
  const [licence, setLicence] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<RxItemInput[]>([])
  const [busy, setBusy] = useState(false)

  const add = (m: PharmacyMedicine) => setItems((l) => (l.some((x) => x.product_id === m.id) ? l : [...l, { product_id: m.id, label: m.label, prescribed_qty: 1, dosage: '' }]))
  const edit = (id: number, patch: Partial<RxItemInput>) => setItems((l) => l.map((x) => (x.product_id === id ? { ...x, ...patch } : x)))

  async function save() {
    if (prescriber.trim() === '') return pharmacyToast('Prescriber is required', true)
    if (items.length === 0) return pharmacyToast('Add at least one medication', true)
    setBusy(true)
    try {
      await saveRx({ prescriber_name: prescriber, prescriber_licence: licence, note, items })
      pharmacyToast('Prescription captured (draft)')
      onSaved()
      onClose()
    } catch (e) {
      pharmacyToast(failMsg(e, 'Save failed'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Capture prescription" onClose={onClose} footer={<><CancelButton onClick={onClose} /><PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</PrimaryButton></>}>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Prescriber"><input value={prescriber} onChange={(e) => setPrescriber(e.target.value)} className={FIELD} /></Labeled>
        <Labeled label="Licence"><input value={licence} onChange={(e) => setLicence(e.target.value)} className={FIELD} /></Labeled>
        <Labeled label="Note" full><input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} /></Labeled>
        <MedicinePicker label="Add medication" onPick={add} />
      </div>
      {items.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead><tr><th className="text-left">Medication</th><th className="w-20 text-left">Qty</th><th className="text-left">Dosage</th><th /></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.product_id}>
                <td><b className="text-text!">{it.label}</b></td>
                <td><input className={`${CELL} w-14`} value={String(it.prescribed_qty)} onChange={(e) => edit(it.product_id, { prescribed_qty: Number(e.target.value) || 0 })} /></td>
                <td><input className={`${CELL} w-full`} value={it.dosage} placeholder="e.g. 1 tab TDS × 5d" onChange={(e) => edit(it.product_id, { dosage: e.target.value })} /></td>
                <td><button type="button" aria-label="Remove" onClick={() => setItems((l) => l.filter((x) => x.product_id !== it.product_id))} className="text-text-faint hover:text-danger-fg">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  )
}

// purchases/grn_save: supplier reference and the received lines (batch, expiry, qty, cost, MRP); saved as a draft GRN.
export function GrnSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [supplierRef, setSupplierRef] = useState('')
  const [lines, setLines] = useState<GrnLineInput[]>([])
  const [busy, setBusy] = useState(false)

  const add = (m: PharmacyMedicine) => setLines((l) => (l.some((x) => x.product_id === m.id) ? l : [...l, { product_id: m.id, label: m.label, batch: '', eatby: '', qty: 1, cost: 0, mrp: 0 }]))
  const edit = (id: number, key: keyof GrnLineInput, value: string) =>
    setLines((l) => l.map((x) => (x.product_id === id ? { ...x, [key]: key === 'batch' || key === 'eatby' ? value : Number(value) || 0 } : x)))

  async function save() {
    if (lines.length === 0) return pharmacyToast('Add at least one line', true)
    setBusy(true)
    try {
      await saveGrn(supplierRef, lines)
      pharmacyToast('Goods receipt saved (draft)')
      onSaved()
      onClose()
    } catch (e) {
      pharmacyToast(failMsg(e, 'Save failed'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="New goods receipt" onClose={onClose} footer={<><CancelButton onClick={onClose} /><PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save receipt'}</PrimaryButton></>}>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Supplier invoice / delivery ref" full><input value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} className={FIELD} /></Labeled>
        <MedicinePicker label="Add medicine" onPick={add} />
      </div>
      {lines.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left">Medicine</th><th className="text-left">Batch</th><th className="text-left">Expiry</th><th className="text-left">Qty</th><th className="text-left">Cost</th><th className="text-left">MRP</th><th /></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.product_id}>
                  <td><b className="text-text!">{l.label}</b></td>
                  <td><input className={`${CELL} w-20`} value={l.batch} onChange={(e) => edit(l.product_id, 'batch', e.target.value)} /></td>
                  <td><input className={`${CELL} w-32`} type="date" value={l.eatby} onChange={(e) => edit(l.product_id, 'eatby', e.target.value)} /></td>
                  <td><input className={`${CELL} w-14`} value={String(l.qty)} onChange={(e) => edit(l.product_id, 'qty', e.target.value)} /></td>
                  <td><input className={`${CELL} w-16`} value={String(l.cost)} onChange={(e) => edit(l.product_id, 'cost', e.target.value)} /></td>
                  <td><input className={`${CELL} w-16`} value={String(l.mrp)} onChange={(e) => edit(l.product_id, 'mrp', e.target.value)} /></td>
                  <td><button type="button" aria-label="Remove" onClick={() => setLines((x) => x.filter((y) => y.product_id !== l.product_id))} className="text-text-faint hover:text-danger-fg">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Sheet>
  )
}

const blankMedicine = (): MedicineForm => ({ label: '', ref: '', generic_name: '', salt_composition: '', strength: '', dosage_form: '', pack_size: '', schedule_class: '', hsn_code: '', price: '', tva_tx: '16', is_rx_only: false, itemclassification: '', item_type: '1', fk_unit: '', packing: '', vat_code: '' })
const fromProduct = (p: PharmacyMedicineDetail['product']): MedicineForm => ({
  label: p.label ?? '',
  ref: p.ref ?? '',
  generic_name: p.generic ?? '',
  salt_composition: p.salt ?? '',
  strength: p.strength ?? '',
  dosage_form: p.dosage_form ?? '',
  pack_size: p.pack_size ?? '',
  schedule_class: p.schedule_class ?? '',
  hsn_code: p.hsn_code ?? '',
  price: p.price_ht != null ? String(p.price_ht) : '',
  tva_tx: p.tva_tx != null ? String(p.tva_tx) : '16',
  is_rx_only: !!p.rx_only || !!p.schedule_class,
  itemclassification: String(p.itemclassification ?? ''),
  item_type: String(p.item_type ?? '1') || '1',
  fk_unit: p.fk_unit ? String(p.fk_unit) : '',
  packing: p.packing ? String(p.packing) : '',
  vat_code: String(p.vat_code ?? ''),
})

// api.php medicines/save: "New medicine" (no product) or "Edit medicine" (the product from medicines/detail).
export function MedicineSheet({ product, onClose, onSaved }: { product?: PharmacyMedicineDetail['product']; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<MedicineForm>(() => (product ? fromProduct(product) : blankMedicine()))
  const [busy, setBusy] = useState(false)
  const units = usePharmacyUnits().data ?? []
  const set = <K extends keyof MedicineForm>(k: K, val: MedicineForm[K]) => setV((x) => ({ ...x, [k]: val }))
  const text = (k: Exclude<keyof MedicineForm, 'is_rx_only'>, label: string, full?: boolean) => (
    <Labeled label={label} full={full}>
      <input value={v[k]} onChange={(e) => set(k, e.target.value)} className={FIELD} />
    </Labeled>
  )
  const unitSelect = (k: 'fk_unit' | 'packing', label: string) => (
    <Labeled label={label}>
      <select value={v[k]} onChange={(e) => set(k, e.target.value)} className={FIELD}>
        <option value="">—</option>
        {units.map((u) => (
          <option key={u.id} value={String(u.id)}>{u.label || u.code}</option>
        ))}
      </select>
    </Labeled>
  )

  async function save() {
    if (v.label.trim() === '') return pharmacyToast('Medicine name is required', true)
    setBusy(true)
    try {
      await saveMedicine(product?.id ?? 0, v)
      pharmacyToast(product ? 'Medicine updated' : 'Medicine created')
      onSaved()
      onClose()
    } catch (e) {
      pharmacyToast(failMsg(e, 'Save failed'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={product ? 'Edit medicine' : 'New medicine'} onClose={onClose} footer={<><CancelButton onClick={onClose} /><PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save medicine'}</PrimaryButton></>}>
      <div className="grid grid-cols-2 gap-3">
        {text('label', 'Brand / name', true)}
        {text('generic_name', 'Generic')}
        {text('salt_composition', 'Salt / active')}
        {text('strength', 'Strength')}
        {text('dosage_form', 'Form')}
        {text('pack_size', 'Pack size')}
        {text('ref', 'Code / SKU')}
        {text('hsn_code', 'HSN')}
        <Labeled label="Schedule class">
          <select value={v.schedule_class} onChange={(e) => set('schedule_class', e.target.value)} className={FIELD}>
            <option value="">OTC (none)</option>
            <option value="H">H</option>
            <option value="H1">H1</option>
            <option value="X">X (narcotic)</option>
          </select>
        </Labeled>
        {text('price', 'Price (excl. VAT)')}
        {text('tva_tx', 'VAT %')}
        <label className="col-span-2 flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={v.is_rx_only} onChange={(e) => set('is_rx_only', e.target.checked)} /> Prescription-only (Rx)
        </label>
        <p className="col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-text-faint">
          ZRA fiscal (required to fiscalise a dispense)
          {product?.zra_registered === true && <Pill tone="ok">registered</Pill>}
          {product?.zra_registered === false && <Pill tone="warn">not registered</Pill>}
        </p>
        {text('itemclassification', 'ZRA item class code')}
        <Labeled label="Item type">
          <select value={v.item_type} onChange={(e) => set('item_type', e.target.value)} className={FIELD}>
            <option value="1">1 — Raw material</option>
            <option value="2">2 — Finished product</option>
            <option value="3">3 — Service</option>
          </select>
        </Labeled>
        {unitSelect('fk_unit', 'Quantity unit')}
        {unitSelect('packing', 'Packing unit')}
        {text('vat_code', 'ZRA VAT category')}
      </div>
    </Sheet>
  )
}
