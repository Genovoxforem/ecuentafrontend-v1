import { useState } from 'react'
import { PackagePlus, X as XIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../products/products.queries'
import { useRackAssignments, useCreateRackAssignment, useRacks, useShelves, useWarehouses } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

// Same local-only convention as the other Rack pages (real llx_shelvesdet
// table exists, but its module isn't activated server-side).
export function ProductRackAssignPage() {
  const assignments = useRackAssignments()
  const racks = useRacks()
  const shelves = useShelves()
  const warehouses = useWarehouses()
  const { data: products } = useProductOptions()
  const createAssignment = useCreateRackAssignment()

  const [showForm, setShowForm] = useState(false)
  const [rackRef, setRackRef] = useState('')
  const [shelfRef, setShelfRef] = useState('')
  const [productRef, setProductRef] = useState('')
  const [lotSerial, setLotSerial] = useState('')
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')

  const rackLabel = (ref: string) => racks.find((r) => r.ref === ref)?.name || ref || '-'
  const warehouseLabelForRack = (ref: string) => {
    const rack = racks.find((r) => r.ref === ref)
    return warehouses.find((w) => w.ref === rack?.warehouseRef)?.shortName || '-'
  }
  const shelvesForRack = shelves.filter((s) => s.rackRef === rackRef)

  function handleAssign() {
    const product = (products ?? []).find((p) => p.ref === productRef)
    if (!rackRef) return setError('Rack is required.')
    if (!shelfRef) return setError('Shelf is required.')
    if (!product) return setError('Product is required.')
    const q = Number(qty)
    if (!qty || Number.isNaN(q) || q <= 0) return setError('Qty must be a positive number.')
    setError('')
    createAssignment({ rackRef, shelfRef, productRef: product.ref, productLabel: product.label, lotSerial, qty: q })
    setRackRef('')
    setShelfRef('')
    setProductRef('')
    setLotSerial('')
    setQty('')
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackagePlus size={20} className="text-brand" /> Product Rack/Shelf Assignment
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <PackagePlus size={14} />}
          {showForm ? 'Cancel' : 'Assign Products'}
        </button>
      </div>

      {showForm && (
        <Card className="!h-auto">
          {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
          {racks.length === 0 && <p className="text-sm text-text-faint mb-3">No racks created yet — add one on the Racks page first.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Rack</label>
              <select value={rackRef} onChange={(e) => { setRackRef(e.target.value); setShelfRef('') }} className={selectCls}>
                <option value="">Select…</option>
                {racks.map((r) => (
                  <option key={r.ref} value={r.ref}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Shelf</label>
              <select value={shelfRef} onChange={(e) => setShelfRef(e.target.value)} className={selectCls} disabled={!rackRef}>
                <option value="">Select…</option>
                {shelvesForRack.map((s) => (
                  <option key={s.ref} value={s.ref}>
                    {s.ref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Product</label>
              <select value={productRef} onChange={(e) => setProductRef(e.target.value)} className={selectCls}>
                <option value="">Select Predefined Product/services</option>
                {(products ?? []).map((p) => (
                  <option key={p.id} value={p.ref}>
                    {p.ref} — {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Lot/Serial</label>
              <input value={lotSerial} onChange={(e) => setLotSerial(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Qty</label>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={handleAssign} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Save
            </button>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">No</th>
              <th className="font-medium px-4 py-2.5">Rack Label</th>
              <th className="font-medium px-4 py-2.5">Warehouse</th>
              <th className="font-medium px-4 py-2.5">Shelves Ref</th>
              <th className="font-medium px-4 py-2.5">Lot</th>
              <th className="font-medium px-4 py-2.5">Product Name</th>
              <th className="font-medium px-4 py-2.5 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              assignments.map((a, i) => (
                <tr key={a.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-text-faint">{i + 1}</td>
                  <td className="px-4 py-3 text-brand font-medium">{rackLabel(a.rackRef)}</td>
                  <td className="px-4 py-3 text-text-muted">{warehouseLabelForRack(a.rackRef)}</td>
                  <td className="px-4 py-3 text-text-muted">{a.shelfRef}</td>
                  <td className="px-4 py-3 text-text-muted">{a.lotSerial || '-'}</td>
                  <td className="px-4 py-3 text-text!">{a.productLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text!">{a.qty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
