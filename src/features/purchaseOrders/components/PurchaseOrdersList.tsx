import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileEdit, Plus, ShoppingCart, CalendarPlus, DollarSign, FileText, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, TwoValueStatCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatMoney } from '../../../utils/format'
import type { PurchaseOrdersSummary } from '../purchaseOrders.queries'

const COLUMNS = ['Ref', 'Ref. Order Vendor', 'Request Author', 'Third-Party', 'City', 'Zip Code', 'Order Date', 'Planned Date Of Delivery', 'Amount (Excl. Tax)', 'Status', 'Billed']
const PER_PAGE = 15

export function PurchaseOrdersList({ summary }: { summary: PurchaseOrdersSummary }) {
  const [page, setPage] = useState(1)
  const pageOrders = summary.orders.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileEdit size={20} className="text-brand" /> List Of Purchase Orders
        </h2>
        <Link to={ROUTES.purchaseOrderCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Order
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Purchase Orders</p>
            <p className="text-2xl font-bold text-text! mt-1">{summary.totalOrders}</p>
            <p className="text-xs text-text-faint mt-1">All purchase order records</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
            <ShoppingCart size={18} />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Purchase Orders This Month</p>
            <p className="text-2xl font-bold text-text! mt-1">{summary.ordersThisMonth}</p>
            <p className="text-xs text-text-faint mt-1">Created this month</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
            <CalendarPlus size={18} />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Purchase Amount</p>
            <p className="text-2xl font-bold text-text! mt-1">{fmtZMW(summary.totalPurchaseAmount)}</p>
            <p className="text-xs text-text-faint mt-1">Total purchase value</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
            <DollarSign size={18} />
          </span>
        </Card>
        <TwoValueStatCard label="Order Status" primary={summary.approvedCount} primaryLabel="Approved" secondary={summary.pendingCount} secondaryLabel="Pending" icon={FileText} color="indigo" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select disabled defaultValue="15" className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            <option value="15">15</option>
          </select>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input disabled type="text" placeholder="Search" className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5" />
          </div>
          <button type="button" disabled title="Not built yet" className="p-2 rounded-md border border-input-border bg-input-bg text-text-faint cursor-default ml-auto">
            <CalendarDays size={14} />
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
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
              ) : (
                pageOrders.map((o) => (
                  <tr key={o.ref} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{o.ref}</td>
                    <td className="px-4 py-3 text-text-muted">{o.refOrderVendor}</td>
                    <td className="px-4 py-3 text-text-muted">{o.requestAuthor}</td>
                    <td className="px-4 py-3 text-text!">{o.thirdParty}</td>
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
      <ListPagination page={page} perPage={PER_PAGE} total={summary.orders.length} onPageChange={setPage} />
    </div>
  )
}
