import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Shuffle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions, useProductStockOverview, useTransferStock } from '../../products/products.queries'
import { useWarehouses } from '../warehouseExtras.queries'
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

// Stock transfer — a real write through productinfo/api/stock_api.php
// (`transfer_stock`, the same call the product's Stock tab makes): one
// transfer of a product from a source warehouse to a target warehouse, which
// the backend records as its own out/in movement pair. Only what that call
// accepts is offered — warehouses, product, units, label and a batch number for
// lot/serial-tracked products (the legacy form's "transfer into a different
// product" and other-branch options have no equivalent in it).
export function StockTransferPage() {
  const queryClient = useQueryClient()
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const transferStock = useTransferStock()

  const [warehouseFrom, setWarehouseFrom] = useState('')
  const [warehouseTo, setWarehouseTo] = useState('')
  const [productId, setProductId] = useState('')
  const [units, setUnits] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const stock = useProductStockOverview(productId || undefined)
  const hasBatch = stock.data?.hasBatch ?? false
  const selectedProduct = (products ?? []).find((p) => String(p.id) === productId)

  function handleSave() {
    setSaved('')
    if (!warehouseFrom) return setError('Source warehouse is required.')
    if (!selectedProduct) return setError('Product is required.')
    if (!warehouseTo) return setError('Target warehouse is required.')
    if (warehouseTo === warehouseFrom) return setError('Target warehouse must be different from the source warehouse.')
    if (!units || !(Number(units) > 0)) return setError('Number of units must be a positive number.')
    if (hasBatch && !batchNumber.trim()) return setError('Batch number is required for lot/serial tracked products.')
    setError('')
    transferStock.mutate(
      { id: productId, warehouseFrom, warehouseTo, qty: units, label, batchNumber: batchNumber.trim() },
      {
        onSuccess: () => {
          setSaved(`Stock transferred: ${units} × ${selectedProduct.ref}.`)
          setUnits('')
          setBatchNumber('')
          setLabel('')
          // The list below, the warehouse pages and the product stock figures all read the real movements.
          queryClient.invalidateQueries({ queryKey: ['warehouses'] })
          queryClient.invalidateQueries({ queryKey: ['products'] })
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'The stock transfer failed.'),
      },
    )
  }

  function handleCancel() {
    setError('')
    setSaved('')
    setUnits('')
    setBatchNumber('')
    setLabel('')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Shuffle size={20} className="text-brand" /> Stock transfer
      </h2>

      <Card className="!h-auto">
        {error && (
          <p role="alert" className="text-sm font-medium text-danger mb-3">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm font-medium text-success mb-3">
            {saved}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
          <Field label="Warehouse" required>
            <select value={warehouseFrom} onChange={(e) => setWarehouseFrom(e.target.value)} className={selectCls}>
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product" required>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectCls}>
              <option value="">Select Predefined Product/services</option>
              {(products ?? [])
                .filter((p) => p.type === 'product')
                .map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.ref} — {p.label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Target warehouse" required>
            <select value={warehouseTo} onChange={(e) => setWarehouseTo(e.target.value)} className={selectCls}>
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number of units" required>
            <input type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} className={inputCls} />
          </Field>
          {hasBatch && (
            <Field label="Lot/Serial number" required>
              <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. LOT-001" className={inputCls} />
            </Field>
          )}
          <Field label="Label of movement">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Stock transfer of product into another warehouse" className={inputCls} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={handleCancel} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={transferStock.isPending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {transferStock.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Card>

      <StockMovementsListPage embedded />
    </div>
  )
}
