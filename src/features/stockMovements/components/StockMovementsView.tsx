import { useState } from 'react'
import { ArrowLeftRight, Boxes, Layers, Banknote, Clock } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useStockMovements, type StockMovementRow } from '../stockMovements.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25

type SortKey = 'date' | 'product' | 'warehouse' | 'type' | 'label' | 'author' | 'qty'

// This page's real backend (product/stock/ajax/movement_list_api.php)
// paginates server-side, so only the current page's rows are ever in
// memory — sorting applies within the loaded page, same caveat as the
// other server-paginated lists in this app (e.g. ContactListPage.tsx).
function sortValue(m: StockMovementRow, key: SortKey): string | number {
  switch (key) {
    case 'date':
      return m.date
    case 'product':
      return `${m.productRef} ${m.productLabel}`
    case 'warehouse':
      return m.warehouseRef
    case 'type':
      return m.typeLabel
    case 'label':
      return m.label
    case 'author':
      return m.author
    case 'qty':
      return m.qty
  }
}

// Real via product/stock/ajax/movement_list_api.php — see
// stockMovements.queries.ts for the full evidence trail. Reads only
// (get_page_data); the real page's Correct Stock / Transfer Stock / Update
// to ZRA actions are mutations and aren't wired here.
export function StockMovementsView({ warehouseId, productId }: { warehouseId?: number; productId?: number }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useStockMovements({ warehouseId, productId }, page, PAGE_SIZE)

  const title = data?.warehouseHeader?.label || data?.productHeader?.label || 'Stock Movements'
  const movements = data?.movements ?? []
  const { sorted: sortedMovements, sort, toggleSort } = useSortableRows<StockMovementRow, SortKey>(movements, sortValue)

  function getExportData() {
    return {
      headers: ['Date', 'Product', 'Warehouse', 'Type', 'Label', 'Author', 'Qty'],
      rows: sortedMovements.map((m) => [m.date, `${m.productRef} — ${m.productLabel}`, m.warehouseRef, m.typeLabel, m.label, m.author, m.qtyDisplay]),
    }
  }

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

          <div className="flex justify-end">
            <TableExportButtons title="Stock Movements" getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <TheadRow>
                  <Th sortKey="date" sort={sort} onSort={toggleSort}>Date</Th>
                  <Th sortKey="product" sort={sort} onSort={toggleSort}>Product</Th>
                  <Th sortKey="warehouse" sort={sort} onSort={toggleSort}>Warehouse</Th>
                  <Th sortKey="type" sort={sort} onSort={toggleSort}>Type</Th>
                  <Th sortKey="label" sort={sort} onSort={toggleSort}>Label</Th>
                  <Th sortKey="author" sort={sort} onSort={toggleSort}>Author</Th>
                  <Th sortKey="qty" sort={sort} onSort={toggleSort} align="right">Qty</Th>
                </TheadRow>
              </thead>
              <tbody>
                {sortedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-text-faint italic">
                      No stock movements found for the current month.
                    </td>
                  </tr>
                ) : (
                  sortedMovements.map((m) => (
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

          <ListPagination page={page + 1} perPage={PAGE_SIZE} total={data.total} onPageChange={(p) => setPage(p - 1)} edgeToEdge />
        </>
      )}
    </div>
  )
}
