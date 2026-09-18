import { useState } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelWarehouses, useHotelInventory, useHotelStockMoves } from '../hotel.queries'

// Real via custom/hotel/api.php?r=warehouses|inventory|stockmoves — the
// Hotel Suite app's own Inventory view, explicitly read-only there too
// ("managed in Ecuenta Stock").
export function HotelInventory() {
  const { data: warehouses, isLoading: whLoading } = useHotelWarehouses()
  const [search, setSearch] = useState('')
  const [low, setLow] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedLow, setAppliedLow] = useState('')
  const { data: items, isLoading, isError, error, refetch } = useHotelInventory(appliedSearch, appliedLow)
  const { data: moves, isLoading: movesLoading } = useHotelStockMoves()

  const threshold = Number(appliedLow) || 0

  return (
    <div className="space-y-4">

      {!whLoading && warehouses && (
        <div className="flex flex-wrap gap-3">
          {warehouses.map((w) => (
            <Card key={w.id} className="!h-auto !p-3 flex-1 min-w-[160px]">
              <p className="text-xs text-text-faint">
                {w.ref}
                {w.lieu ? ` · ${w.lieu}` : ''}
              </p>
              <p className="text-2xl font-bold text-text!">{Number(w.units).toLocaleString()}</p>
              <p className="text-xs text-text-faint">{w.items} items in stock</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text!">Stock levels</h3>
          <span className="text-xs text-text-faint">Read-only · managed in Ecuenta Stock</span>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setAppliedSearch(search)
                setAppliedLow(low)
              }
            }}
            placeholder="Search item / ref"
            className="flex-1 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm"
          />
          <input
            type="number"
            min={0}
            value={low}
            onChange={(e) => setLow(e.target.value)}
            placeholder="Low ≤"
            title="Show items at or below this level"
            className="w-28 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setAppliedSearch(search)
              setAppliedLow(low)
            }}
            className="h-9 rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover"
          >
            Filter
          </button>
        </div>

        {isLoading && <LegacyLoadingCard label="Loading stock…" />}
        {isError && <LegacyErrorCard title="Couldn't load stock" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
        {items && items.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No matching items.</p>
        ) : (
          items && (
            <div className="overflow-auto max-h-80 no-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-2 py-2">Item</th>
                    <th className="font-medium px-2 py-2">Ref</th>
                    <th className="font-medium px-2 py-2 text-right">In stock</th>
                    <th className="font-medium px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const stock = r.stock ?? 0
                    const isLow = (r.seuil != null && stock <= r.seuil) || (threshold > 0 && stock <= threshold) || stock <= 0
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 text-text!">{r.label || '—'}</td>
                        <td className="px-2 py-2 text-text-faint text-xs">{r.ref || ''}</td>
                        <td className="px-2 py-2 text-right text-text-muted">{stock.toLocaleString()}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${stock <= 0 ? 'bg-warning-bg text-warning-fg' : isLow ? 'bg-warning-bg text-warning-fg' : 'bg-success-bg text-success-fg'}`}
                          >
                            {stock <= 0 ? 'Out' : isLow ? 'Low' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Recent stock movements</h3>
        {movesLoading && <LegacyLoadingCard label="Loading movements…" />}
        {moves && moves.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No movements.</p>
        ) : (
          moves && (
            <div className="overflow-auto max-h-80 no-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-2 py-2">When</th>
                    <th className="font-medium px-2 py-2">Item</th>
                    <th className="font-medium px-2 py-2 text-right">Qty</th>
                    <th className="font-medium px-2 py-2">Warehouse</th>
                    <th className="font-medium px-2 py-2">By</th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((m, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-2 py-2 text-text-faint whitespace-nowrap">{m.at}</td>
                      <td className="px-2 py-2 text-text!">{m.label || m.ref || '—'}</td>
                      <td className={`px-2 py-2 text-right font-medium ${m.qty < 0 ? 'text-danger' : 'text-success-fg'}`}>
                        {m.qty > 0 ? '+' : ''}
                        {m.qty}
                      </td>
                      <td className="px-2 py-2 text-text-muted">{m.warehouse || '—'}</td>
                      <td className="px-2 py-2 text-text-muted">{m.by_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  )
}
