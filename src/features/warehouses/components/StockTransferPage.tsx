import { useState, type ReactNode } from 'react'
import { Shuffle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouses, todayIso } from '../warehouseExtras.queries'
import { useRecordStockMovements } from '../warehouses.queries'
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

// A real backend endpoint for this exists (api/bulktransfer/ — full CRUD
// against llx_stock_bulk_transfer, confirmed live) but requires real
// numeric warehouse IDs, and this app has no REST endpoint that lists real
// warehouses (only the local, session-only picker below — see
// warehouseExtras.queries.ts). Submitting our local warehouses' fake refs
// to that real API would write bogus foreign keys into a real table, which
// is worse than not persisting at all — so, like Stock Correction, this
// records into the local movement ledger instead (one Transfer Out at the
// source warehouse, one Transfer In at the target), both real enough to
// show up immediately in "List Of Stock Movements" below and to move the
// effective stock numbers shown elsewhere in the app.
export function StockTransferPage() {
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const recordMovements = useRecordStockMovements()

  const [warehouseRef, setWarehouseRef] = useState('')
  const [productRef, setProductRef] = useState('')
  const [targetWarehouseRef, setTargetWarehouseRef] = useState('')
  const [targetProductRef, setTargetProductRef] = useState('')
  const [units, setUnits] = useState('')
  const [date, setDate] = useState(todayIso())
  const [lotSerial, setLotSerial] = useState('')
  const [eatBy, setEatBy] = useState('')
  const [sellBy, setSellBy] = useState('')
  const [label, setLabel] = useState('Stock transfer of product into another warehouse')
  const [movementCode, setMovementCode] = useState('')
  const [error, setError] = useState('')

  const products_ = products ?? []
  const sourceProduct = products_.find((p) => p.ref === productRef)
  const targetProduct = products_.find((p) => p.ref === targetProductRef) || sourceProduct

  function handleSave() {
    if (!warehouseRef) return setError('Warehouse is required.')
    if (!sourceProduct) return setError('Product is required.')
    if (!targetWarehouseRef) return setError('Target warehouse is required.')
    if (targetWarehouseRef === warehouseRef) return setError('Target warehouse must be different from the source warehouse.')
    const qty = Number(units)
    if (!units || Number.isNaN(qty) || qty <= 0) return setError('Number of units must be a positive number.')
    setError('')
    recordMovements([
      {
        productRef: sourceProduct.ref,
        productLabel: sourceProduct.label,
        delta: -qty,
        reason: label || 'Stock transfer of product into another warehouse',
        warehouseRef,
        lotSerial: lotSerial || undefined,
        type: 'Transfer Out',
      },
      {
        productRef: (targetProduct ?? sourceProduct).ref,
        productLabel: (targetProduct ?? sourceProduct).label,
        delta: qty,
        reason: label || 'Stock transfer of product into another warehouse',
        warehouseRef: targetWarehouseRef,
        lotSerial: lotSerial || undefined,
        type: 'Transfer In',
      },
    ])
    setUnits('')
    setLotSerial('')
    setMovementCode('')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Shuffle size={20} className="text-brand" /> Stock transfer
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
              {products_.map((p) => (
                <option key={p.id} value={p.ref}>
                  {p.ref} — {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target Branch" required>
            <select className={selectCls} disabled>
              <option>Master entity</option>
            </select>
          </Field>
          <Field label="Number of units" required>
            <input type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Target warehouse" required>
            <select value={targetWarehouseRef} onChange={(e) => setTargetWarehouseRef(e.target.value)} className={selectCls}>
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.ref} value={w.ref}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ProductTarget">
            <select value={targetProductRef} onChange={(e) => setTargetProductRef(e.target.value)} className={selectCls}>
              <option value="">Same as source product</option>
              {products_.map((p) => (
                <option key={p.id} value={p.ref}>
                  {p.ref} — {p.label}
                </option>
              ))}
            </select>
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
          <Field label="Date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
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
