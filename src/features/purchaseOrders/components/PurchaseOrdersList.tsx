import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileEdit, Plus, ShoppingCart, CalendarPlus, DollarSign, FileText, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, TwoValueStatCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { formatMoney } from '../../../utils/format'
import type { PurchaseOrderRow, PurchaseOrdersSummary } from '../purchaseOrders.queries'

const COLUMNS = ['Ref', 'Ref. Order Vendor', 'Request Author', 'Third-Party', 'City', 'Zip Code', 'Order Date', 'Planned Date Of Delivery', 'Amount (Excl. Tax)', 'Status', 'Billed']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(order: PurchaseOrderRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [order.ref, order.refOrderVendor, order.requestAuthor, order.thirdParty, order.city, order.zipCode, order.status].some((field) => field.toLowerCase().includes(q))
}

export function PurchaseOrdersList({ summary }: { summary: PurchaseOrdersSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredOrders = useMemo(() => summary.orders.filter((o) => matchesSearch(o, search)), [summary.orders, search])
  const pageOrders = filteredOrders.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = filteredOrders.map((o) => [
      o.ref,
      o.refOrderVendor,
      o.requestAuthor,
      o.thirdParty,
      o.city,
      o.zipCode,
      o.orderDate,
      o.plannedDelivery,
      `${formatMoney(o.amountExclTax)} ZMW`,
      o.status,
      o.billed ? 'Yes' : 'No',
    ])
    return { headers: COLUMNS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileEdit size={20} className="text-brand" /> List Of Purchase Orders
        </h2>
        <Link to={ROUTES.purchaseOrderCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Order
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Purchase Orders</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.totalOrders}</p>
              <p className="text-xs text-text-faint mt-0.5">All purchase order records</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <ShoppingCart size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Purchase Orders This Month</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.ordersThisMonth}</p>
              <p className="text-xs text-text-faint mt-0.5">Created this month</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <CalendarPlus size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Purchase Amount</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(summary.totalPurchaseAmount)}</p>
              <p className="text-xs text-text-faint mt-0.5">Total purchase value</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <DollarSign size={20} />
            </span>
          </Card>
          <TwoValueStatCard label="Order Status" primary={summary.approvedCount} primaryLabel="Approved" secondary={summary.pendingCount} secondaryLabel="Pending" icon={FileText} color="indigo" />
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
            <TableExportButtons title="List Of Purchase Orders" getExportData={getExportData} />
            <button type="button" disabled title="Not built yet" className="p-2 rounded-md border border-input-border bg-input-bg text-text-faint cursor-default ml-auto">
              <CalendarDays size={14} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No orders match "{search}".
                  </td>
                </tr>
              ) : (
                pageOrders.map((o) => (
                  <tr key={o.ref} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">
                      {o.id ? (
                        <Link to={ROUTES.purchaseOrderDetail.replace(':id', String(o.id))} className="hover:underline">
                          {o.ref}
                        </Link>
                      ) : (
                        o.ref
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{o.refOrderVendor}</td>
                    <td className="px-4 py-3 text-text-muted">{o.requestAuthor}</td>
                    <td className="px-4 py-3 text-text!">
                      {o.socid ? (
                        <Link to={`${ROUTES.customerDetail.replace(':id', String(o.socid))}?tab=vendor`} className="hover:underline">
                          {o.thirdParty}
                        </Link>
                      ) : (
                        o.thirdParty
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{o.city}</td>
                    <td className="px-4 py-3 text-text-muted">{o.zipCode}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{o.orderDate}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{o.plannedDelivery}</td>
                    <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(o.amountExclTax)} ZMW</td>
                    <td className="px-4 py-3 text-text-muted">{o.status}</td>
                    <td className="px-4 py-3 text-text-muted">{o.billed ? 'Yes' : 'No'}</td>
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
