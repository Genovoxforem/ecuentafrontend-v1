import { useState, type ReactNode } from 'react'
import { FilePenLine } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouses, todayIso } from '../warehouseExtras.queries'
import { useRecordStockMovement } from '../warehouses.queries'
import { StockMovementsListPage } from './StockMovementsListPage'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-text-muted'}`}>
        {label}
        {required && '*'}
      </label>
      {children}
    </div>
  )
}

// No backend endpoint exists for stock corrections (see
// warehouses.queries.ts) — recording one writes into the same local,
// session-scoped movement ledger Stock Transfer/Mass Stock Transfer/Box
// Break also feed, which the "Movements - Full List" page (rendered below,
// same as the legacy page's own layout) reads back from. It genuinely
// changes the effective stock shown elsewhere in this app (Warehouse
// dashboard, Product Stocks), it just never reaches the real database.
export function StockCorrectionPage() {
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const recordMovement = useRecordStockMovement()

  const [warehouseRef, setWarehouseRef] = useState('')
  const [productRef, setProductRef] = useState('')
  const [units, setUnits] = useState('')
  const [date, setDate] = useState(todayIso())
  const [lotSerial, setLotSerial] = useState('')
  const [eatBy, setEatBy] = useState('')
  const [sellBy, setSellBy] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [label, setLabel] = useState('Stock correction for product')
  const [movementCode, setMovementCode] = useState('')
  const [error, setError] = useState('')

  const selectedProduct = (products ?? []).find((p) => p.ref === productRef)

  function handleSave() {
    if (!warehouseRef) return setError('Warehouse is required.')
    if (!selectedProduct) return setError('Product is required.')
    const qty = Number(units)
    if (!units || Number.isNaN(qty) || qty === 0) return setError('Number of units must be a non-zero number.')
    setError('')
    recordMovement({
      productRef: selectedProduct.ref,
      productLabel: selectedProduct.label,
      delta: qty,
      reason: label || 'Stock correction for product',
      warehouseRef,
      lotSerial: lotSerial || undefined,
      type: 'Correction',
    })
    setUnits('')
    setLotSerial('')
    setMovementCode('')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FilePenLine size={20} className="text-brand" /> Stock correction
      </h2>

      <Card className="!h-auto">
        {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
          <Field label="Warehouse" required>
            <select value={warehouseRef} onChange={(e) => setWarehouseRef(e.target.value)} className={selectCls}>
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.ref} value={w.ref}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product" required>
            <select value={productRef} onChange={(e) => setProductRef(e.target.value)} className={selectCls}>
              <option value="">Select Predefined Product/services</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.ref}>
                  {p.ref} — {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number of units" required>
            <input type="number" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Positive to add, negative to remove" className={inputCls} />
          </Field>
          <Field label="Date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Lot/Serial number">
            <input value={lotSerial} onChange={(e) => setLotSerial(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Eat-by date">
            <input type="date" value={eatBy} onChange={(e) => setEatBy(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Sell-by date">
            <input type="date" value={sellBy} onChange={(e) => setSellBy(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Unit purchase price">
            <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Project">
            <select className={selectCls} disabled>
              <option>Select a project</option>
            </select>
          </Field>
          <Field label="Label of movement">
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Movement or inventory code">
            <input value={movementCode} onChange={(e) => setMovementCode(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setError('')} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            Save
          </button>
        </div>
      </Card>

      <StockMovementsListPage />
    </div>
  )
}
