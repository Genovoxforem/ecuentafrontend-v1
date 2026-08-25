import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { useCreateInventoryReal, useWarehouses, todayIso } from '../warehouseExtras.queries'
import { useProductOptions } from '../../products/products.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

// Submits to the real product/inventory/card.php?action=add (see
// warehouseExtras.queries.ts) instead of the session-only local stub this
// used to be. Product is a real optional field on the create form
// (fk_product — "Inventory for a specific product") that an earlier pass
// missed by reading two non-adjacent chunks of the real page's HTML and
// skipping the section in between; confirmed live it sits right after
// Warehouse.
export function InventoryCreateForm() {
  const navigate = useNavigate()
  const createInventory = useCreateInventoryReal()
  const warehouses = useWarehouses()
  const { data: products } = useProductOptions()

  const [ref, setRef] = useState('')
  const [label, setLabel] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [valueDate, setValueDate] = useState('')
  const [error, setError] = useState('')

  function handleCreate() {
    if (!ref.trim()) return setError('Ref. is required!')
    setError('')
    createInventory.mutate(
      { ref: ref.trim(), label, warehouseId, productId, valueDate: valueDate || todayIso() },
      {
        onSuccess: () => navigate(ROUTES.inventoryList),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create inventory.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ClipboardList size={20} className="text-brand" /> New inventory
      </h2>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
        <Field label="Ref." required>
          <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Label">
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Warehouse">
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
            <option value="">Select…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.shortName || w.ref}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Product">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectCls}>
            <option value="">Select…</option>
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.ref} — {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value date">
          <div className="flex gap-1.5">
            <input type="date" value={valueDate} onChange={(e) => setValueDate(e.target.value)} className={inputCls} />
            <button type="button" onClick={() => setValueDate(todayIso())} className="rounded-md border border-input-border px-3 text-sm text-text-muted hover:bg-surface-hover shrink-0">
              Now
            </button>
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate(ROUTES.inventoryList)}
          className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={createInventory.isPending}
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createInventory.isPending && <LoaderCircle size={14} className="animate-spin" />} Create
        </button>
      </div>
    </div>
  )
}
