import { useState } from 'react'
import { Utensils, Coffee, RefreshCw, Eye } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import {
  useKitchenOrders,
  useSetKitchenOrderComplete,
  KITCHEN_ORDER_STATUS_OPTIONS,
  type KitchenOrderRow,
  type KitchenOrdersFilters,
} from '../kitchen.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const EMPTY_FILTERS: KitchenOrdersFilters = { date: '', token: '', thirdParty: '', city: '', paymentType: '', orderStatus: '', completed: '' }

const inputCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

type SortKey = 'ref' | 'date' | 'customer' | 'city' | 'table' | 'tokenNo' | 'paymentType' | 'totalHt' | 'totalItems' | 'author' | 'status' | 'completed'

function sortValue(o: KitchenOrderRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return o.ref
    case 'date':
      return o.date
    case 'customer':
      return o.customer
    case 'city':
      return o.city
    case 'table':
      return o.table
    case 'tokenNo':
      return o.tokenNo
    case 'paymentType':
      return o.paymentType
    case 'totalHt':
      return o.totalHt
    case 'totalItems':
      return o.totalItems
    case 'author':
      return o.author
    case 'status':
      return o.status
    case 'completed':
      return o.completed ? 1 : 0
  }
}

// Real editable Yes/No control backed by kitchen/order_status_change.php's
// order_complete branch (see kitchen.queries.ts) — the backend itself
// re-checks the invoice is paid before allowing completion and rejects
// with a real message otherwise, surfaced here inline rather than silently
// reverting.
function CompletedCell({ row }: { row: KitchenOrderRow }) {
  const setComplete = useSetKitchenOrderComplete()
  const [localError, setLocalError] = useState('')

  function handleChange(value: string) {
    setLocalError('')
    setComplete.mutate(
      { orderId: row.id, complete: value === '1' },
      { onError: (err) => setLocalError(err instanceof Error ? err.message : 'Could not update.') },
    )
  }

  return (
    <div className="min-w-[90px]">
      <select
        value={row.completed ? '1' : '0'}
        disabled={setComplete.isPending}
        onChange={(e) => handleChange(e.target.value)}
        className={`${inputCls} h-8 py-0 ${row.completed ? 'text-success-fg' : 'text-warning-fg'}`}
      >
        <option value="1">Yes</option>
        <option value="0">No</option>
      </select>
      {localError && <p className="text-[11px] text-danger-fg mt-1 max-w-[160px]">{localError}</p>}
    </div>
  )
}

// Real via kitchen/order_ajax_list.php — see kitchen.queries.ts's header
// comment for the full column/filter-mapping evidence and the live
// security gap (no permission check on this endpoint). This mirrors the
// real "Kitchen Order Management" screen (kitchen/ordermanagement.php),
// which posts the same 7 real filters to the same endpoint.
export function KitchenOrdersList({ kind }: { kind: 'kitchen' | 'beverage' }) {
  const Icon = kind === 'beverage' ? Coffee : Utensils
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [draftFilters, setDraftFilters] = useState<KitchenOrdersFilters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<KitchenOrdersFilters>(EMPTY_FILTERS)

  const { data, isLoading, isError, error, refetch, isFetching } = useKitchenOrders(kind, filters, page, perPage)
  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const { sorted: sortedOrders, sort, toggleSort } = useSortableRows<KitchenOrderRow, SortKey>(orders, sortValue)

  function updateDraft<K extends keyof KitchenOrdersFilters>(key: K, value: KitchenOrdersFilters[K]) {
    setDraftFilters((f) => ({ ...f, [key]: value }))
  }

  function handleSearch() {
    setPage(1)
    setFilters(draftFilters)
  }

  function getExportData() {
    return {
      headers: ['Ref', 'Invoice Date', 'Token No', 'Table', 'Third-Party', 'City', 'Payment Type', 'Amount (Excl. Tax)', 'Author', 'Status', 'Order Status', 'Completed'],
      rows: sortedOrders.map((o) => [
        o.ref,
        o.date,
        o.tokenNo || '',
        o.table || '',
        o.customer,
        o.city,
        o.paymentType,
        o.totalHt,
        o.author,
        o.status,
        `${o.totalItems} (${o.pendingItems})`,
        o.completed ? 'Yes' : 'No',
      ]),
    }
  }

  return (
    // -m-6 + flex-1 flex-col: same full-height pattern as ThirdPartyList.tsx / ServicesList.tsx
    // — keeps ListPagination pinned to the true bottom of the viewport instead of floating
    // right under the table with dead space below it on a short page.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {kind === 'beverage' ? 'Beverage Order Management' : 'Kitchen Order Management'}
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {/* Real filter row — every field posts straight through to order_ajax_list.php's own
            filterDate/filterToken/filterThirdParty/filterCity/filterPaymentType/
            filterOrderStatus/filterCompleted params, applied server-side, matching
            kitchen/ordermanagement.php's own filter row exactly. */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={draftFilters.date}
            onChange={(e) => updateDraft('date', e.target.value)}
            className={inputCls}
            title="Search Invoice Date"
          />
          <input
            type="text"
            value={draftFilters.token}
            onChange={(e) => updateDraft('token', e.target.value)}
            placeholder="Search Token No"
            className={`${inputCls} w-36`}
          />
          <input
            type="text"
            value={draftFilters.thirdParty}
            onChange={(e) => updateDraft('thirdParty', e.target.value)}
            placeholder="Search Third-party"
            className={`${inputCls} w-40`}
          />
          <input
            type="text"
            value={draftFilters.city}
            onChange={(e) => updateDraft('city', e.target.value)}
            placeholder="Search City"
            className={`${inputCls} w-36`}
          />
          <input
            type="text"
            value={draftFilters.paymentType}
            onChange={(e) => updateDraft('paymentType', e.target.value)}
            placeholder="Search Payment Type"
            className={`${inputCls} w-40`}
          />
          <select value={draftFilters.orderStatus} onChange={(e) => updateDraft('orderStatus', e.target.value)} className={`${inputCls} appearance-none`}>
            {KITCHEN_ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={draftFilters.completed} onChange={(e) => updateDraft('completed', e.target.value)} className={`${inputCls} appearance-none`}>
            <option value="">Completed Status</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
          <button type="button" onClick={handleSearch} className="h-9 px-4 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover">
            Search
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text-muted text-sm font-medium hover:bg-surface-hover disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {isError && <LegacyErrorCard title="Couldn't load orders" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value))
              setPage(1)
            }}
            className={inputCls}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <TableExportButtons title={kind === 'beverage' ? 'Beverage Orders' : 'Kitchen Orders'} getExportData={getExportData} />
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="date" sort={sort} onSort={toggleSort}>Invoice Date</Th>
                  <Th sortKey="tokenNo" sort={sort} onSort={toggleSort}>Token No</Th>
                  <Th sortKey="table" sort={sort} onSort={toggleSort}>Table</Th>
                  <Th sortKey="customer" sort={sort} onSort={toggleSort}>Third-Party</Th>
                  <Th sortKey="city" sort={sort} onSort={toggleSort}>City</Th>
                  <Th sortKey="paymentType" sort={sort} onSort={toggleSort}>Payment Type</Th>
                  <Th sortKey="totalHt" sort={sort} onSort={toggleSort} align="right">Amount (Excl. Tax)</Th>
                  <Th sortKey="author" sort={sort} onSort={toggleSort}>Author</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                  <Th sortKey="totalItems" sort={sort} onSort={toggleSort}>Order Status</Th>
                  <Th sortKey="completed" sort={sort} onSort={toggleSort}>Completed</Th>
                  <Th>Action</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-8">
                      <LegacyLoadingCard label="Loading orders…" />
                    </td>
                  </tr>
                ) : sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-4 text-text-faint italic">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{o.ref}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{o.date}</td>
                      <td className="px-3 py-2 text-text-muted">{o.tokenNo || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{o.table || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{o.customer}</td>
                      <td className="px-3 py-2 text-text-muted">{o.city || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{o.paymentType || '—'}</td>
                      <td className="px-3 py-2 text-right text-text!">{o.totalHt}</td>
                      <td className="px-3 py-2 text-text-muted">{o.author}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{o.status}</span>
                      </td>
                      <td className="px-3 py-2 text-text-muted">
                        {o.totalItems > 0 ? (
                          <span className="flex items-center gap-1.5" title={`Total: ${o.totalItems} · Pending: ${o.pendingItems} · Preparing: ${o.preparingItems} · Completed: ${o.completedItems}`}>
                            <span className="text-text!">{o.totalItems}</span>
                            <span className="text-warning-fg">({o.pendingItems})</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <CompletedCell row={o} />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled
                          title="No JSON detail API exists for this on the current backend — the real endpoint only returns an HTML fragment and mutates data as a side effect of viewing it, so this isn't wired here. Use the Legacy view for full order details."
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-neutral-bg text-neutral-fg cursor-not-allowed opacity-60"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={page} perPage={perPage} total={total} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
