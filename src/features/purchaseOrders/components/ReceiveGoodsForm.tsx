import { useMemo, useState } from 'react'
import { LoaderCircle, PackageCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatNumber } from '../../../utils/format'
import { usePurchaseOrderDispatch, useReceivePurchaseOrder } from '../purchaseOrderDetail.queries'

const inputCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 w-full'

interface RowState {
  qty: string
  warehouseId: string
  batch: string
  eatby: string
  comment: string
}

// Receiving goods against a purchase order (fourn/commande/fapi/dispatch.php?action=receive). The
// server refuses a receipt above what a line still owes, a line that is not on the order, a warehouse
// outside the entity and a missing lot on a batch-tracked product, and writes all lines in one
// transaction, so a failed line leaves no stock movement behind.
export function ReceiveGoodsForm({ id }: { id: string }) {
  const { data, isLoading, isError } = usePurchaseOrderDispatch(id)
  const receive = useReceivePurchaseOrder(id)
  const [rows, setRows] = useState<Record<number, Partial<RowState>>>({})
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const lines = useMemo(() => data?.lines ?? [], [data])
  const defaultWarehouse = data?.defaultWarehouseId ?? ''
  const rowOf = (lineId: number, remaining: number): RowState => ({
    qty: String(remaining),
    warehouseId: defaultWarehouse,
    batch: '',
    eatby: '',
    comment: '',
    ...rows[lineId],
  })
  const patch = (lineId: number, change: Partial<RowState>) => setRows((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...change } }))

  if (isLoading) return null
  if (isError || !data) return null
  if (!data.lines) {
    return (
      <Card className="!h-auto shrink-0">
        <p className="text-sm text-text-muted">Receiving goods needs the fourn/commande/fapi/dispatch.php API, which this backend does not have.</p>
      </Card>
    )
  }

  const toReceive = lines
    .map((l) => ({ line: l, state: rowOf(l.lineId, l.remaining) }))
    .filter(({ state }) => Number(state.qty) > 0)

  function submit() {
    setMessage(null)
    receive.mutate(
      {
        lines: toReceive.map(({ line, state }) => ({
          lineId: line.lineId,
          qty: Number(state.qty),
          warehouseId: Number(state.warehouseId),
          batch: state.batch,
          eatby: state.eatby,
          comment: state.comment,
        })),
      },
      {
        onSuccess: (res) => {
          setRows({})
          setMessage({ kind: 'ok', text: res?.status_changed === false ? 'Goods received. The order status could not be updated automatically.' : 'Goods received.' })
        },
        onError: (e) => setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not receive the goods.' }),
      },
    )
  }

  const outstanding = lines.some((l) => l.remaining > 0)

  return (
    <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-text!">Receive goods</h3>
        <button
          type="button"
          disabled={receive.isPending || toReceive.length === 0 || !outstanding}
          onClick={submit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {receive.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <PackageCheck size={14} />} Receive
        </button>
      </div>
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`px-4 py-2 text-sm ${message.kind === 'error' ? 'text-danger' : 'text-success'}`}>
          {message.text}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Product</th>
              <th className="font-medium px-4 py-2.5 text-right">Ordered</th>
              <th className="font-medium px-4 py-2.5 text-right">Received</th>
              <th className="font-medium px-4 py-2.5 text-right">Remaining</th>
              <th className="font-medium px-4 py-2.5 w-28">Qty to receive</th>
              <th className="font-medium px-4 py-2.5 w-44">Warehouse</th>
              <th className="font-medium px-4 py-2.5 w-36">Lot / serial</th>
              <th className="font-medium px-4 py-2.5 w-36">Eat-by</th>
              <th className="font-medium px-4 py-2.5">Comment</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-text-faint italic">
                  This order has no lines to receive.
                </td>
              </tr>
            ) : (
              lines.map((l) => {
                const state = rowOf(l.lineId, l.remaining)
                const done = l.remaining <= 0
                return (
                  <tr key={l.lineId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text!">{l.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatNumber(l.ordered)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatNumber(l.received)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatNumber(l.remaining)}</td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} max={l.remaining} disabled={done} value={done ? 0 : state.qty} onChange={(e) => patch(l.lineId, { qty: e.target.value })} className={inputCls} />
                    </td>
                    <td className="px-4 py-2">
                      <select disabled={done} value={state.warehouseId} onChange={(e) => patch(l.lineId, { warehouseId: e.target.value })} className={inputCls}>
                        {(data.warehouses ?? []).map((w) => (
                          <option key={w.value} value={w.value}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" disabled={done} placeholder={l.batchTracked ? 'Required' : ''} value={state.batch} onChange={(e) => patch(l.lineId, { batch: e.target.value })} className={inputCls} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="date" disabled={done} value={state.eatby} onChange={(e) => patch(l.lineId, { eatby: e.target.value })} className={inputCls} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" disabled={done} value={state.comment} onChange={(e) => patch(l.lineId, { comment: e.target.value })} className={inputCls} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
