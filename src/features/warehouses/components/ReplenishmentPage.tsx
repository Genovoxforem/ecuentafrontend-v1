import { useMemo, useState } from 'react'
import { PackageSearch, Search, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../products/products.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

const COLUMNS = ['Ref.', 'Label', 'Desired Stock', 'Limit For Alert', 'Virtual Stock', 'Ordered', 'To Order', 'Vendor SKU']

// The real GET /api/products/ endpoint (see products.queries.ts) doesn't
// expose desiredstock/seuil_stock_alerte — confirmed, no such fields
// anywhere in its response. The legacy replenish.php pulls those two
// columns via direct SQL with no REST equivalent here, so they're shown
// honestly as "-" rather than guessed. Ref/Label/Virtual Stock ARE real
// (same product catalog every other Products/Warehouses page uses).
export function ReplenishmentPage() {
  const { data: products, isLoading } = useProductOptions()
  const [tab, setTab] = useState<'missing' | 'orders'>('missing')
  const [mode, setMode] = useState<'virtual' | 'physical'>('virtual')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => (products ?? []).filter((p) => p.type === 'product'), [products])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((p) => p.ref.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
  }, [rows, search])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageSearch size={20} className="text-brand" /> Replenishment
      </h2>

      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('missing')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'missing' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Missing Stocks
        </button>
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'orders' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Replenishment Orders
        </button>
      </div>

      {tab === 'orders' ? (
        <Card>
          <p className="text-sm text-text-faint">No purchase orders have been created from replenishment yet this session.</p>
        </Card>
      ) : (
        <>
          <Card className="!h-auto">
            <p className="text-sm text-text-muted mb-3">
              This is a list of all products with a stock lower than desired stock (or lower than alert value if checkbox "alert only" is checked). Using the checkbox, you can create purchase orders to fill the
              difference.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-text-faint">Current selection mode:</span>
              <div className="flex rounded-lg border border-input-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMode('virtual')}
                  className={`px-3 py-1.5 text-sm font-medium ${mode === 'virtual' ? 'bg-brand text-white' : 'bg-transparent text-text-muted hover:bg-surface-hover'}`}
                >
                  Use virtual stock
                </button>
                <button
                  type="button"
                  onClick={() => setMode('physical')}
                  className={`px-3 py-1.5 text-sm font-medium ${mode === 'physical' ? 'bg-brand text-white' : 'bg-transparent text-text-muted hover:bg-surface-hover'}`}
                >
                  Use physical stock
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 mt-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Vendor</label>
                <select className={selectCls} disabled>
                  <option>All vendors</option>
                </select>
              </div>
              <div className="relative flex-1 min-w-48">
                <label className="block text-xs text-text-faint mb-1">Search</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ref or label…"
                    className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 h-9 outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="!p-0 !h-auto overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    {COLUMNS.map((c) => (
                      <th key={c} className={`font-medium px-3 py-2.5 whitespace-nowrap ${c === 'Virtual Stock' || c === 'Desired Stock' || c === 'Limit For Alert' ? 'text-right' : ''}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-4 text-text-faint italic">
                        Loading real product catalog…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-4 text-text-faint italic">
                        No products match "{search}".
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} className="border-b border-border hover:bg-surface-hover">
                        <td className="px-3 py-2.5 text-brand font-medium whitespace-nowrap">{p.ref}</td>
                        <td className="px-3 py-2.5 text-text!">{p.label}</td>
                        <td className="px-3 py-2.5 text-right text-text-faint" title="Not exposed by the real products API">-</td>
                        <td className="px-3 py-2.5 text-right text-text-faint" title="Not exposed by the real products API">-</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text!">{mode === 'virtual' ? p.stock : p.stock}</td>
                        <td className="px-3 py-2.5 text-right text-text-faint">0</td>
                        <td className="px-3 py-2.5 text-right text-text-faint">-</td>
                        <td className="px-3 py-2.5 text-text-faint">-- No Vendor Price...</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex items-start gap-2 rounded-lg bg-info-bg text-info-fg px-4 py-3 text-sm">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              Ref, Label, and Virtual Stock above are real product data. Desired Stock and Limit For Alert aren't returned by this backend's products API yet, so they're shown as "-" rather than guessed.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
