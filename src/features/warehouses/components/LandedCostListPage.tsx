import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../products/products.queries'
import { useLandedCosts } from '../warehouseExtras.queries'
import { formatDate } from '../../../utils/format'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'

export function LandedCostListPage() {
  const [productFilter, setProductFilter] = useState('')
  const { data: products } = useProductOptions()
  const costs = useLandedCosts()
  const filtered = productFilter ? costs.filter((c) => c.purchaseInvoice === productFilter) : costs

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Truck size={20} className="text-brand" /> List Landed Cost
      </h2>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-text-faint mb-1">Product</label>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={selectCls + ' w-56'}>
            <option value="">-- Select Product --</option>
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.label}>
                {p.ref} — {p.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Go
        </button>
        <button type="button" onClick={() => setProductFilter('')} className="rounded-md border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          Clear
        </button>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Ref</th>
              <th className="font-medium px-4 py-2.5">Product</th>
              <th className="font-medium px-4 py-2.5">Vendor</th>
              <th className="font-medium px-4 py-2.5">Service/Expense</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount</th>
              <th className="font-medium px-4 py-2.5 text-right">Allocated Amount</th>
              <th className="font-medium px-4 py-2.5 text-right">Unallocated Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.ref} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(c.startDate)}</td>
                  <td className="px-4 py-3 text-brand">{c.ref}</td>
                  <td className="px-4 py-3 text-text-muted">{c.purchaseInvoice || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">—</td>
                  <td className="px-4 py-3 text-text-muted">{c.landedExpense || '—'}</td>
                  <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                  <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                  <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
