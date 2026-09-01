import { useState } from 'react'
import { ArrowLeftRight, Boxes, Layers, Banknote, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useStockMovements } from '../stockMovements.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25

// Real via product/stock/ajax/movement_list_api.php — see
// stockMovements.queries.ts for the full evidence trail. Reads only
// (get_page_data); the real page's Correct Stock / Transfer Stock / Update
// to ZRA actions are mutations and aren't wired here.
export function StockMovementsView({ warehouseId, productId }: { warehouseId?: number; productId?: number }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useStockMovements({ warehouseId, productId }, page, PAGE_SIZE)

  const title = data?.warehouseHeader?.label || data?.productHeader?.label || 'Stock Movements'

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ArrowLeftRight size={20} className="text-brand" /> Stock Movements — {title}
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading stock movements…" />}
      {isError && <LegacyErrorCard title="Couldn't load stock movements" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          {data.warehouseHeader && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="!h-auto flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
                  <Boxes size={18} />
                </span>
                <div>
                  <p className="text-xs text-text-faint">Total Products</p>
                  <p className="font-semibold text-text!">{data.warehouseHeader.nbProducts}</p>
                </div>
              </Card>
              <Card className="!h-auto flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
                  <Layers size={18} />
                </span>
                <div>
                  <p className="text-xs text-text-faint">Different Products</p>
                  <p className="font-semibold text-text!">{data.warehouseHeader.nbDifferentProducts}</p>
                </div>
              </Card>
              <Card className="!h-auto flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
                  <Banknote size={18} />
                </span>
                <div>
                  <p className="text-xs text-text-faint">Stock Value</p>
                  <p className="font-semibold text-text!">{data.warehouseHeader.stockValue}</p>
                </div>
              </Card>
              <Card className="!h-auto flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
                  <Clock size={18} />
                </span>
                <div>
                  <p className="text-xs text-text-faint">Last Movement</p>
                  <p className="font-semibold text-text!">{data.warehouseHeader.lastMovement}</p>
                </div>
              </Card>
            </div>
          )}

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Product</th>
                  <th className="font-medium px-3 py-2">Warehouse</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2">Label</th>
                  <th className="font-medium px-3 py-2">Author</th>
                  <th className="font-medium px-3 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-text-faint italic">
                      No stock movements found for the current month.
                    </td>
                  </tr>
                ) : (
                  data.movements.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{m.date}</td>
                      <td className="px-3 py-2 text-text!">
                        {m.productRef} — {m.productLabel}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{m.warehouseRef}</td>
                      <td className="px-3 py-2 text-text-muted">{m.typeLabel}</td>
                      <td className="px-3 py-2 text-text-muted">{m.label}</td>
                      <td className="px-3 py-2 text-text-muted">{m.author}</td>
                      <td className={`px-3 py-2 text-right font-medium ${m.qty >= 0 ? 'text-success-fg' : 'text-danger-fg'}`}>{m.qtyDisplay}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{data.total} movements</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span>Page {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * PAGE_SIZE >= data.total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
