/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Info, LoaderCircle, Plus, Trash2, Truck, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { formatMoney } from '../../../utils/format'
import { useVendorInvoices } from '../../vendorInvoices/vendorInvoices.queries'
import { useAllocateLandedCost } from '../landedCosts.queries'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Create Landed Cost: pick a vendor invoice, list the extra costs (freight, clearing ...) and let the server spread
// them over the invoice's goods lines by value or quantity (fourn/facture/fapi/landed_costs.php?action=allocate).
// "Preview" is a dry run that writes nothing; "Allocate" saves. The product's average cost is not changed, as on the
// classic pages: the landed cost is reported beside the purchase cost.
export function LandedCostCreateForm() {
  const navigate = useNavigate()
  const invoices = useVendorInvoices('all')
  const allocate = useAllocateLandedCost()
  const [invoiceId, setInvoiceId] = useState('')
  const [method, setMethod] = useState<'value' | 'quantity'>('value')
  const [costs, setCosts] = useState([{ description: '', amount: '' }])
  const [preview, setPreview] = useState<any>(null)
  const [error, setError] = useState('')

  const payload = () => ({
    invoiceId: Number(invoiceId),
    method,
    costs: costs.filter((c) => c.description.trim() && Number(c.amount) > 0).map((c) => ({ description: c.description.trim(), amount: Number(c.amount) })),
  })

  function run(dryRun: boolean) {
    setError('')
    const input = payload()
    if (!input.invoiceId) return setError('Choose a vendor invoice.')
    if (input.costs.length === 0) return setError('Add at least one cost with a description and an amount.')
    allocate.mutate(
      { input, dryRun },
      {
        onSuccess: (d) => (dryRun ? setPreview(d) : navigate(ROUTES.landedCostList)),
        onError: (e) => setError(e instanceof Error ? e.message : 'The allocation failed.'),
      },
    )
  }

  const shares: any[] = preview?.allocations ?? preview?.shares ?? preview?.rows ?? []

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> Create Landed Cost
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.landedCostList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Back
        </Link>
      }
      footerRight={
        <>
          <button type="button" disabled={allocate.isPending} onClick={() => run(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60">
            Preview
          </button>
          <button type="button" disabled={allocate.isPending} onClick={() => run(false)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {allocate.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Allocate
          </button>
        </>
      }
    >
      <div className="flex-1 flex flex-col gap-4 min-w-0 shrink-0">
        {error && (
          <Card className="!h-auto shrink-0 !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
            {error}
          </Card>
        )}
        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-xs font-medium text-text-muted">
              Vendor invoice
              <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className={inputCls + ' mt-1'}>
                <option value="">-- Select invoice --</option>
                {(invoices.data?.items ?? [])
                  .filter((v) => v.id)
                  .map((v) => (
                    <option key={v.id} value={v.id!}>
                      {v.ref} — {v.thirdPartyName ?? ''}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-text-muted">
              Spread the costs by
              <select value={method} onChange={(e) => setMethod(e.target.value as 'value' | 'quantity')} className={inputCls + ' mt-1'}>
                <option value="value">Value of each goods line</option>
                <option value="quantity">Quantity of each goods line</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Costs</h3>
          <div className="space-y-2">
            {costs.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="Description (freight, clearing ...)" value={c.description} onChange={(e) => setCosts((cs) => cs.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className={inputCls} />
                <input type="number" min="0" step="0.01" placeholder="Amount" value={c.amount} onChange={(e) => setCosts((cs) => cs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} className={inputCls + ' !w-40 text-right'} />
                <button type="button" onClick={() => setCosts((cs) => (cs.length > 1 ? cs.filter((_, j) => j !== i) : cs))} className="p-2 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger" title="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setCosts((cs) => [...cs, { description: '', amount: '' }])} className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline">
            <Plus size={13} /> Add cost
          </button>
        </Card>

        {preview && (
          <Card className="!h-auto">
            <h3 className="flex items-center gap-2 font-semibold text-text! mb-2">
              <Info size={15} className="text-brand" /> Preview — nothing has been saved
            </h3>
            {shares.length === 0 ? (
              <p className="text-sm text-text-muted">The server accepted the costs. {preview.message ?? ''}</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {shares.map((s, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-1.5 text-text-muted">{s.product?.label ?? s.product_label ?? s.description ?? `Line ${i + 1}`}</td>
                      <td className="py-1.5 text-right tabular-nums text-text!">{formatMoney(s.share ?? s.amount ?? s.allocated ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(preview.skipped_lines ?? []).length > 0 && <p className="mt-2 text-xs text-text-faint">{preview.skipped_lines.length} service / no-product line(s) are skipped.</p>}
          </Card>
        )}
      </div>
    </StickyFormShell>
  )
}
