import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useProductOptions, useTransferStock } from '../../products/products.queries'
import { useWarehouses } from '../warehouseExtras.queries'

const inputCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

interface DraftRow {
  id: number
  sourceWarehouseId: string
  targetWarehouseId: string
  productId: string
  lotSerial: string
  qty: string
}

let nextRowId = 1
function emptyRow(): DraftRow {
  return { id: nextRowId++, sourceWarehouseId: '', targetWarehouseId: '', productId: '', lotSerial: '', qty: '' }
}

function isComplete(row: DraftRow) {
  return !!row.sourceWarehouseId && !!row.targetWarehouseId && !!row.productId && Number(row.qty) > 0
}

// Mass stock transfer — one real transfer per row through
// productinfo/api/stock_api.php (`transfer_stock`, the call the product's Stock
// tab and the Stock transfer page use), run one after another. A row that the
// backend accepts is removed from the table; one it refuses stays, with the
// backend's reason under it, so it can be fixed and run again.
export function MassStockTransferPage() {
  const queryClient = useQueryClient()
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const transferStock = useTransferStock()

  const [rows, setRows] = useState<DraftRow[]>([emptyRow()])
  const [running, setRunning] = useState(false)
  const [transferred, setTransferred] = useState(0)
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [error, setError] = useState('')

  function updateRow(id: number, patch: Partial<DraftRow>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  function addRow() {
    setRows((cur) => [...cur, emptyRow()])
  }
  function removeRow(id: number) {
    setRows((cur) => (cur.length > 1 ? cur.filter((r) => r.id !== id) : cur))
    setRowErrors((cur) => {
      const { [id]: _dropped, ...rest } = cur
      return rest
    })
  }

  async function handleRun() {
    const complete = rows.filter(isComplete)
    if (complete.length === 0) {
      setError('Fill in at least one complete row (source, target, product, and a positive qty) before recording.')
      return
    }
    setError('')
    setRunning(true)
    const failed: Record<number, string> = {}
    const succeeded = new Set<number>()
    for (const row of complete) {
      if (row.sourceWarehouseId === row.targetWarehouseId) {
        failed[row.id] = 'Source and target warehouses must differ.'
        continue
      }
      try {
        await transferStock.mutateAsync({
          id: row.productId,
          warehouseFrom: row.sourceWarehouseId,
          warehouseTo: row.targetWarehouseId,
          qty: row.qty,
          label: 'Mass stock transfer',
          batchNumber: row.lotSerial.trim(),
        })
        succeeded.add(row.id)
      } catch (err) {
        failed[row.id] = err instanceof Error ? err.message : 'The transfer failed.'
      }
    }
    setRunning(false)
    setTransferred((n) => n + succeeded.size)
    setRowErrors(failed)
    setRows((cur) => {
      const rest = cur.filter((r) => !succeeded.has(r.id))
      return rest.length > 0 ? rest : [emptyRow()]
    })
    if (succeeded.size > 0) {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
    const skipped = rows.length - complete.length
    if (skipped > 0) setError(`${skipped} incomplete row${skipped === 1 ? ' was' : 's were'} left untouched.`)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ArrowLeftRight size={20} className="text-brand" /> Mass stock transfer
      </h2>
      <p className="text-sm text-text-faint -mt-2">
        Select a source warehouse and a target warehouse, a product and a quantity for each row, then click "Record Movements".
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {transferred > 0 && (
        <p role="status" className="text-sm font-medium text-success">
          {transferred} transfer{transferred === 1 ? '' : 's'} recorded.
        </p>
      )}

      <Card className="!p-0 !h-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              <Th>Source Warehouse</Th>
              <Th>Target Warehouse</Th>
              <Th>Product</Th>
              <Th>Lot/Serial</Th>
              <Th>Qty</Th>
              <Th></Th>
            </TheadRow>
          </thead>
          <tbody>
            {rows.map((row) => (
              <RowFragment key={row.id} error={rowErrors[row.id]}>
                <td className="px-3 py-2">
                  <select value={row.sourceWarehouseId} onChange={(e) => updateRow(row.id, { sourceWarehouseId: e.target.value })} className={selectCls + ' w-full'}>
                    <option value="">Select A Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={String(w.id)}>
                        {w.shortName || w.ref}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={row.targetWarehouseId} onChange={(e) => updateRow(row.id, { targetWarehouseId: e.target.value })} className={selectCls + ' w-full'}>
                    <option value="">Select A Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={String(w.id)}>
                        {w.shortName || w.ref}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={row.productId} onChange={(e) => updateRow(row.id, { productId: e.target.value })} className={selectCls + ' w-full min-w-40'}>
                    <option value="">Select Predefined Product/services</option>
                    {(products ?? [])
                      .filter((p) => p.type === 'product')
                      .map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.ref} — {p.label}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input value={row.lotSerial} onChange={(e) => updateRow(row.id, { lotSerial: e.target.value })} className={inputCls + ' w-28'} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min={0} value={row.qty} onChange={(e) => updateRow(row.id, { qty: e.target.value })} className={inputCls + ' w-20'} />
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => removeRow(row.id)} title="Remove row" className="p-1.5 rounded-md text-text-faint hover:bg-danger/10 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </td>
              </RowFragment>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 rounded-lg border border-input-border px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          <Plus size={14} /> Add Row
        </button>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 ml-auto"
        >
          {running && <Loader2 size={14} className="animate-spin" />}
          {running ? 'Recording…' : 'Record Movements'}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-text-faint">
        <span>or Select A Stock Movement File To Import</span>
        <button type="button" disabled title="Not built yet" className="rounded-md border border-input-border px-3 py-1.5 text-text-faint cursor-not-allowed">
          Choose File
        </button>
      </div>
    </div>
  )
}

// A table row plus, when the backend refused that transfer, a line under it
// carrying the backend's reason.
function RowFragment({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <>
      <tr className={error ? '' : 'border-b border-border'}>{children}</tr>
      {error && (
        <tr className="border-b border-border">
          <td colSpan={6} className="px-3 pb-2 text-xs font-medium text-danger">
            {error}
          </td>
        </tr>
      )}
    </>
  )
}
