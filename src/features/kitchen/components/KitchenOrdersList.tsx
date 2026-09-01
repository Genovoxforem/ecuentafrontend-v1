import { useState } from 'react'
import { Utensils, Coffee } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useKitchenOrders, type KitchenOrderRow } from '../kitchen.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'ref' | 'date' | 'customer' | 'table' | 'tokenNo' | 'totalHt' | 'totalItems' | 'status'

function sortValue(o: KitchenOrderRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return o.ref
    case 'date':
      return o.date
    case 'customer':
      return o.customer
    case 'table':
      return o.table
    case 'tokenNo':
      return o.tokenNo
    case 'totalHt':
      return o.totalHt
    case 'totalItems':
      return o.totalItems
    case 'status':
      return o.status
  }
}

// Real via kitchen/order_ajax_list.php — see kitchen.queries.ts's header
// comment for the full column-mapping evidence and the live security gap
// (no permission check on this endpoint).
export function KitchenOrdersList({ kind }: { kind: 'kitchen' | 'beverage' }) {
  const { data: orders, isLoading, isError, error, refetch } = useKitchenOrders(kind)
  const Icon = kind === 'beverage' ? Coffee : Utensils
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const allOrders = orders ?? []
  const { sorted: sortedOrders, sort, toggleSort } = useSortableRows<KitchenOrderRow, SortKey>(allOrders, sortValue)
  const pageOrders = sortedOrders.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Ref', 'Date', 'Customer', 'Table', 'Token', 'Total', 'Items', 'Status'],
      rows: sortedOrders.map((o) => [o.ref, o.date, o.customer, o.table || '', o.tokenNo || '', o.totalHt, String(o.totalItems), o.status]),
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {kind === 'beverage' ? 'Beverage Orders' : 'Kitchen Orders'}
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading orders…" />}
      {isError && <LegacyErrorCard title="Couldn't load orders" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {orders && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <TableExportButtons title={kind === 'beverage' ? 'Beverage Orders' : 'Kitchen Orders'} getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <TheadRow>
                <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                <Th sortKey="date" sort={sort} onSort={toggleSort}>Date</Th>
                <Th sortKey="customer" sort={sort} onSort={toggleSort}>Customer</Th>
                <Th sortKey="table" sort={sort} onSort={toggleSort}>Table</Th>
                <Th sortKey="tokenNo" sort={sort} onSort={toggleSort}>Token</Th>
                <Th sortKey="totalHt" sort={sort} onSort={toggleSort} align="right">Total</Th>
                <Th sortKey="totalItems" sort={sort} onSort={toggleSort}>Items</Th>
                <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
              </TheadRow>
            </thead>
            <tbody>
              {pageOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                    No orders found.
                  </td>
                </tr>
              ) : (
                pageOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text!">{o.ref}</td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{o.date}</td>
                    <td className="px-3 py-2 text-text-muted">{o.customer}</td>
                    <td className="px-3 py-2 text-text-muted">{o.table || '—'}</td>
                    <td className="px-3 py-2 text-text-muted">{o.tokenNo || '—'}</td>
                    <td className="px-3 py-2 text-right text-text!">{o.totalHt}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {o.totalItems > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-warning-fg">{o.pendingItems} pending</span>
                          {o.preparingItems > 0 && <span className="text-info-fg">· {o.preparingItems} preparing</span>}
                          <span className="text-success-fg">· {o.completedItems} done</span>
                          <span className="text-text-faint">/ {o.totalItems}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{o.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </Card>

          <ListPagination page={page} perPage={perPage} total={allOrders.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
