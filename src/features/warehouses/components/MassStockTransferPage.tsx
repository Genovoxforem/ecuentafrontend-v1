import { useState } from 'react'
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouses } from '../warehouseExtras.queries'
import { useRecordStockMovements } from '../warehouses.queries'

const inputCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

interface DraftRow {
  id: number
  sourceWarehouseRef: string
  targetWarehouseRef: string
  productRef: string
  lotSerial: string
  qty: string
}

let nextRowId = 1
function emptyRow(): DraftRow {
  return { id: nextRowId++, sourceWarehouseRef: '', targetWarehouseRef: '', productRef: '', lotSerial: '', qty: '0' }
}

// Same real-endpoint caveat as Stock Transfer (see StockTransferPage.tsx):
// api/bulktransfer/ is real, but needs real warehouse IDs this app can't
// look up, so recording here writes into the same local movement ledger
// instead — one Transfer Out / Transfer In pair per row.
export function MassStockTransferPage() {
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const recordMovements = useRecordStockMovements()

  const [rows, setRows] = useState<DraftRow[]>([emptyRow()])
  const [recorded, setRecorded] = useState(0)
  const [error, setError] = useState('')

  function updateRow(id: number, patch: Partial<DraftRow>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  function addRow() {
    setRows((cur) => [...cur, emptyRow()])
  }
  function removeRow(id: number) {
    setRows((cur) => (cur.length > 1 ? cur.filter((r) => r.id !== id) : cur))
  }

  function handleRecordMovements() {
    const products_ = products ?? []
    const movements: Parameters<typeof recordMovements>[0] = []
    for (const row of rows) {
      const product = products_.find((p) => p.ref === row.productRef)
      const qty = Number(row.qty)
      if (!row.sourceWarehouseRef || !row.targetWarehouseRef || !product || !qty || qty <= 0) continue
      movements.push(
        { productRef: product.ref, productLabel: product.label, delta: -qty, reason: 'Mass stock transfer', warehouseRef: row.sourceWarehouseRef, lotSerial: row.lotSerial || undefined, type: 'Transfer Out' },
        { productRef: product.ref, productLabel: product.label, delta: qty, reason: 'Mass stock transfer', warehouseRef: row.targetWarehouseRef, lotSerial: row.lotSerial || undefined, type: 'Transfer In' },
      )
    }
    if (movements.length === 0) {
      setError('Fill in at least one complete row (source, target, product, and a positive qty) before recording.')
      return
    }
    setError('')
    recordMovements(movements)
    setRecorded((n) => n + movements.length / 2)
    setRows([emptyRow()])
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ArrowLeftRight size={20} className="text-brand" /> Mass stock transfer
      </h2>
      <p className="text-sm text-text-faint -mt-2">
        Select a source warehouse and a target warehouse, a product and a quantity for each row, then click "Record Movements".
      </p>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      {recorded > 0 && <p className="text-sm font-medium text-success">{recorded} transfer{recorded === 1 ? '' : 's'} recorded so far this session.</p>}

      <Card className="!p-0 !h-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
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
              <tr key={row.id} className="border-b border-border">
                <td className="px-3 py-2">
                  <select value={row.sourceWarehouseRef} onChange={(e) => updateRow(row.id, { sourceWarehouseRef: e.target.value })} className={selectCls + ' w-full'}>
                    <option value="">Select A Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.ref} value={w.ref}>
                        {w.shortName || w.ref}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={row.targetWarehouseRef} onChange={(e) => updateRow(row.id, { targetWarehouseRef: e.target.value })} className={selectCls + ' w-full'}>
                    <option value="">Select A Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.ref} value={w.ref}>
                        {w.shortName || w.ref}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={row.productRef} onChange={(e) => updateRow(row.id, { productRef: e.target.value })} className={selectCls + ' w-full min-w-40'}>
                    <option value="">Select Predefined Product/services</option>
                    {(products ?? []).map((p) => (
                      <option key={p.id} value={p.ref}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 rounded-lg border border-input-border px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          <Plus size={14} /> Add Row
        </button>
        <button type="button" onClick={handleRecordMovements} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover ml-auto">
          Record Movements
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
