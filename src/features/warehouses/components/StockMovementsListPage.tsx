import { useState } from 'react'
import { Warehouse, ShoppingCart, ShoppingBag, Tag, RefreshCw, Printer, FileText } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../products/products.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function StatTile({ label, value, caption, icon: Icon }: { label: string; value: string | number; caption: string; icon: typeof Warehouse }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-0.5">{caption}</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
    </Card>
  )
}

const COLUMNS = ['Ref.', 'Date', 'Product Ref.', 'Product Label', 'Lot/Serial', 'Warehouse', 'Inv./Mov. Code', 'Label Of Movement', 'Type', 'Origin', 'Cost Price', 'Qty', 'ZRA Status']

// No general-purpose stock-movement ledger endpoint exists on this backend
// (the only real /api/zra/stock-movements/* endpoints are ZRA
// tax-filing-shaped, not this warehouse ledger — see warehouses.queries.ts
// header comments). Product ref filter is real data; the stat tiles and
// results are honestly zero/empty, matching the reference demo account.
export function StockMovementsListPage() {
  const { data: products } = useProductOptions()
  const now = new Date()
  const [dateRange, setDateRange] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 - ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`,
  )
  const [productRef, setProductRef] = useState('')

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-faint">Warehouse Stock Information</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Warehouse size={20} className="text-brand" /> List Of Stock Movements
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 rounded-lg bg-brand text-white hover:bg-brand-hover" title="Print">
            <Printer size={16} />
          </button>
          <button type="button" className="p-2 rounded-lg bg-brand text-white hover:bg-brand-hover" title="Export">
            <FileText size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatTile label="Product Use For Sale" value="0 Qty" caption="Today: 0 Qty" icon={ShoppingCart} />
        <StatTile label="Total Product Sold" value="0 Qty" caption="Today: 0 Qty" icon={ShoppingCart} />
        <StatTile label="Total Purchase Done" value="0 Qty" caption="Today: 0 Qty" icon={ShoppingBag} />
        <StatTile label="Total Lot Used" value="0 Lots" caption="Today: 0 Lots" icon={Tag} />
        <StatTile label="Stock Correction Count" value="0 Movements" caption="Today: 0 Movements" icon={RefreshCw} />
      </div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-text-faint mb-1">Movement Date</label>
            <input value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={inputCls + ' w-full'} />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Product ref.</label>
            <select value={productRef} onChange={(e) => setProductRef(e.target.value)} className={selectCls + ' w-full'}>
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
            <select className={selectCls + ' w-full'} disabled>
              <option>Select a Lot</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Inv./Mov. Code</label>
            <select className={selectCls + ' w-full'} disabled>
              <option>Select a Inv/Code</option>
            </select>
          </div>
        </div>
        <button type="button" className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Search
        </button>
      </Card>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              {COLUMNS.map((c) => (
                <th key={c} className="font-medium px-4 py-2.5 whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                No Data Available In Table
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
