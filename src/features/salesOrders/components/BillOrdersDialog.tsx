import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, ReceiptText, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { createInvoicesFromOrders, type BilledInvoice } from '../../../api/invoices'
import { useWarehouseOptions } from '../orderDetail.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2'

// Bill a customer's orders: one invoice per customer through Facture::createFromOrder()
// (compta/facture/fapi/create_from_orders.php). Every order is checked first and one bad
// order means nothing is billed; the whole batch is one transaction.
export function BillOrdersDialog({ orderIds, onClose, onDone }: { orderIds: number[]; onClose: () => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const { data: warehouses } = useWarehouseOptions()
  const [validate, setValidate] = useState(true)
  const [classify, setClassify] = useState(true)
  const [warehouse, setWarehouse] = useState('')
  const [created, setCreated] = useState<BilledInvoice[] | null>(null)

  const bill = useMutation({
    mutationFn: () =>
      createInvoicesFromOrders({
        order_ids: orderIds,
        validate: validate ? 1 : 0,
        classify_orders_billed: classify ? 1 : 0,
        warehouse_id: Number(warehouse || warehouses?.[0]?.id) || undefined,
      }),
    onSuccess: (result) => {
      setCreated(result.invoices)
      void queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onDone()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <ReceiptText size={16} className="text-brand" /> Bill {orderIds.length} order{orderIds.length === 1 ? '' : 's'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {created ? (
            <>
              <p className="text-text!">
                {created.length} invoice{created.length === 1 ? '' : 's'} created.
              </p>
              <ul className="space-y-1">
                {created.map((inv) => (
                  <li key={inv.id}>
                    <Link to={ROUTES.invoiceDetail.replace(':id', String(inv.id))} className="text-brand hover:underline">
                      {inv.ref}
                    </Link>{' '}
                    <span className="text-text-muted">
                      {inv.third_party_name} · {(inv.order_refs ?? []).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-text-muted">One invoice is created per customer. If any selected order cannot be invoiced, nothing is billed.</p>
              <label className="flex items-center gap-2 text-text!">
                <input type="checkbox" checked={validate} onChange={(e) => setValidate(e.target.checked)} /> Validate the invoices
              </label>
              <label className="flex items-center gap-2 text-text!">
                <input type="checkbox" checked={classify} onChange={(e) => setClassify(e.target.checked)} /> Classify the orders as billed
              </label>
              {validate && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-faint">Warehouse (stock leaves it on validation)</span>
                  <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={inputCls}>
                    {(warehouses ?? []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.ref}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {bill.isError && <p role="alert" className="text-xs text-danger">{bill.error instanceof Error ? bill.error.message : 'Could not bill the orders.'}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bill.isPending}
                  onClick={() => bill.mutate()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {bill.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />} Create invoices
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
