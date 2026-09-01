import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileEdit, Plus, ShoppingCart, CalendarPlus, DollarSign, FileText, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Avatar } from '../../../shared/components/Avatar'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney } from '../../../utils/format'
import type { OrderRow, SalesOrdersSummary } from '../salesOrders.queries'

type SortKey = 'ref' | 'refCustomer' | 'projectRef' | 'thirdParty' | 'city' | 'zipCode' | 'orderDate' | 'plannedDelivery' | 'amountExclTax' | 'author' | 'shippable' | 'billed' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Ref. Order For Customer', key: 'refCustomer' },
  { label: 'Project Ref', key: 'projectRef' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'City', key: 'city' },
  { label: 'Zip Code', key: 'zipCode' },
  { label: 'Order Date', key: 'orderDate' },
  { label: 'Planned Date Of Delivery', key: 'plannedDelivery' },
  { label: 'Amount (Excl. Tax)', key: 'amountExclTax' },
  { label: 'Author', key: 'author' },
  { label: 'Shippable', key: 'shippable' },
  { label: 'Billed', key: 'billed' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const STATUS_STYLES: Record<string, string> = {
  Validated: 'bg-warning-bg text-warning-fg',
  Cancelled: 'bg-neutral-bg text-neutral-fg',
  Draft: 'bg-info-bg text-info-fg',
  Closed: 'bg-success-bg text-success-fg',
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{status}</span>
}

function matchesSearch(order: OrderRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [order.ref, order.refCustomer, order.thirdParty, order.city].some((field) => field.toLowerCase().includes(q))
}

function sortValue(row: OrderRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'refCustomer':
      return row.refCustomer
    case 'projectRef':
      return row.projectRef
    case 'thirdParty':
      return row.thirdParty
    case 'city':
      return row.city
    case 'zipCode':
      return row.zipCode
    case 'orderDate':
      return row.orderDate
    case 'plannedDelivery':
      return row.plannedDelivery
    case 'amountExclTax':
      return row.amountExclTax
    case 'author':
      return row.author
    case 'shippable':
      return row.shippable ? 1 : 0
    case 'billed':
      return row.billed ? 1 : 0
    case 'status':
      return row.status
  }
}

export function OrdersList({ summary }: { summary: SalesOrdersSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredOrders = useMemo(() => summary.orders.filter((o) => matchesSearch(o, search)), [summary.orders, search])
  const { sorted: sortedOrders, sort, toggleSort } = useSortableRows<OrderRow, SortKey>(filteredOrders, sortValue)
  const pageOrders = sortedOrders.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedOrders.map((o) => [
      o.ref,
      o.refCustomer,
      o.projectRef,
      o.thirdParty,
      o.city,
      o.zipCode,
      o.orderDate,
      o.plannedDelivery,
      `${formatMoney(o.amountExclTax)} ZMW`,
      o.author,
      o.shippable ? 'Yes' : 'No',
      o.billed ? 'Yes' : 'No',
      o.status,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx — lets
    // the table Card stretch to fill leftover height so ListPagination sits flush against
    // main's true bottom even with few rows, and the header sticks flush at the true top.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileEdit size={20} className="text-brand" /> Orders
        </h2>
        <Link to={ROUTES.orderCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Order
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Orders</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.totalOrders}</p>
              <p className="text-xs text-text-faint mt-0.5">All order records</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <ShoppingCart size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Orders This Month</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.ordersThisMonth}</p>
              <p className="text-xs text-text-faint mt-0.5">Created this month</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <CalendarPlus size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Order Amount</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(summary.totalOrderAmount)}</p>
              <p className="text-xs text-text-faint mt-0.5">Total order value</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <DollarSign size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Order Status</p>
              <p className="text-xl font-bold text-text! mt-1">
                {summary.validatedCount} <span className="text-xs font-normal text-text-faint">Validated</span>
              </p>
              <p className="text-sm font-semibold text-text! mt-0.5">
                {summary.draftCount} <span className="text-xs font-normal text-text-faint">Draft</span>
              </p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
              <FileText size={20} />
            </span>
          </Card>
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Orders" getExportData={getExportData} />
            <button type="button" disabled title="Not built yet" className="p-2 rounded-md border border-input-border bg-input-bg text-text-faint cursor-default ml-auto">
              <CalendarDays size={14} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <TheadRow>
                {COLUMNS.map((col) => (
                  <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                    {col.label}
                  </Th>
                ))}
              </TheadRow>
            </thead>
            <tbody>
              {summary.orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No orders match "{search}".
                  </td>
                </tr>
              ) : (
                pageOrders.map((o) => (
                  <tr key={o.ref} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Link to={ROUTES.orderDetail.replace(':id', String(o.id))} className="text-brand hover:underline">
                        {o.ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{o.refCustomer}</td>
                    <td className="px-4 py-3 text-text-muted">{o.projectRef}</td>
                    <td className="px-4 py-3 text-text!">{o.thirdParty}</td>
                    <td className="px-4 py-3 text-text-muted">{o.city}</td>
                    <td className="px-4 py-3 text-text-muted">{o.zipCode}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{o.orderDate}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{o.plannedDelivery}</td>
                    <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(o.amountExclTax)} ZMW</td>
                    <td className="px-4 py-3 text-text-muted">
                      {o.author && (
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <Avatar name={o.author} size={20} color="bg-teal-500" className="text-[9px]" /> {o.author}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{o.shippable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-text-muted">{o.billed ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredOrders.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
