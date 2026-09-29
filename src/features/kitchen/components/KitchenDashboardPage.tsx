import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartLine, CheckCheck, Clock, Inbox, ListChecks, Loader2, Plus, Receipt, RefreshCw, Ticket, Trash2, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import {
  useKitchenDashboardStats,
  useKitchenDashboardTokens,
  useKitchenOrderDetails,
  useDeleteDraftOrder,
  type KitchenDashboardStatusFilter,
} from '../kitchenDashboard.queries'

function StatCard({ label, caption, value, icon: Icon }: { label: string; caption: string; value: number; icon: typeof Receipt }) {
  return (
    <div className="relative rounded-lg border border-border bg-surface-alt px-3.5 py-2.5">
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="text-2xl font-semibold leading-tight text-brand">{value}</p>
      <p className="text-sm font-medium text-text!">{caption}</p>
      <span className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-text-muted shadow-sm">
        <Icon size={17} />
      </span>
    </div>
  )
}

// The KOT status of a line, coloured as on the backend page.
const KOT_BADGE: Record<string, string> = {
  Pending: 'bg-neutral-bg text-neutral-fg',
  Preparing: 'bg-info-bg text-info-fg',
  'Ready To Serve': 'bg-brand/15 text-brand',
  Served: 'bg-success-bg text-success-fg',
}

// Today in the user's own calendar (toISOString() would give the UTC date, which is
// yesterday for the first hours of a day in Zambia).
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const orderDate = (s: string) => {
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString()
}

function OrderDetailsModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { data, isLoading, isError } = useKitchenOrderDetails(orderId)
  const order = data?.order
  const completed = Number(order?.ordercomplete) === 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-text!">Invoice Details</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text!" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-text-faint">
              <Loader2 size={22} className="animate-spin" />
              <p className="text-sm">Loading invoice details…</p>
            </div>
          ) : isError ? (
            <p className="rounded-lg border border-danger/40 bg-danger-bg/50 px-3 py-2 text-sm text-danger">Error loading invoice details</p>
          ) : !order ? (
            <p className="text-sm text-text-faint italic">Order not found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-text!">Order Information</h4>
                <dl className="space-y-1.5 text-sm">
                  {(
                    [
                      ['Reference', order.ref],
                      ['Token', order.tokenno || 'N/A'],
                      ['Customer', order.customer_name || 'N/A'],
                      ['Date', orderDate(order.datef)],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="font-semibold text-text!">{k}:</dt>
                      <dd className="text-text-muted">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <dt className="font-semibold text-text!">Status:</dt>
                    <dd>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${completed ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                        {completed ? 'Completed Order' : 'Active Order'}
                      </span>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold text-text!">Total:</dt>
                    <dd className="text-text-muted tabular-nums">{Number(order.total_ttc).toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-text!">Order Items</h4>
                {data.items.length === 0 ? (
                  <p className="text-sm text-text-faint">No items found</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold text-text!">
                        <th className="py-1.5 pr-2">Item</th>
                        <th className="py-1.5 px-2">Qty</th>
                        <th className="py-1.5 px-2 text-right">Price</th>
                        <th className="py-1.5 pl-2">KOT Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((i) => (
                        <tr key={i.id} className="border-b border-border last:border-0">
                          <td className="py-1.5 pr-2 text-text!">{i.productLabel || i.description}</td>
                          <td className="py-1.5 px-2 text-text-muted tabular-nums">{i.qty}</td>
                          <td className="py-1.5 px-2 text-right text-text-muted tabular-nums">{i.totalTtc.toFixed(2)}</td>
                          <td className="py-1.5 pl-2">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${KOT_BADGE[i.kotstatus || 'Pending'] ?? KOT_BADGE.Pending}`}>{i.kotstatus || 'Pending'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// kitchen/dashboard.php — the real Kitchen Dashboard: today's (or the chosen
// day's) order counts and the order "tokens" per status, read from
// kitchen/dashboard_ajax.php (see kitchenDashboard.queries.ts). Clicking a
// token opens its invoice; a draft order can be deleted.
export function KitchenDashboardPage() {
  const [date, setDate] = useState(localToday())
  const [status, setStatus] = useState<KitchenDashboardStatusFilter>('all')
  const [viewOrderId, setViewOrderId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useKitchenDashboardStats(date)
  const { data: tokens, isLoading: tokensLoading, refetch: refetchTokens } = useKitchenDashboardTokens(status, date)
  const deleteOrder = useDeleteDraftOrder()
  const confirm = useConfirm()

  function handleRefresh() {
    refetchStats()
    refetchTokens()
  }

  async function handleDelete(id: number, ref: string) {
    const ok = await confirm({
      title: 'Delete Draft Order?',
      message: (
        <>
          Are you sure you want to delete <strong className="text-text!">{ref}</strong>?
        </>
      ),
    })
    if (!ok) return
    setDeleteError('')
    deleteOrder.mutate(id, { onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Could not delete this order.') })
  }

  // The counts are for the chosen day, so the caption says which day.
  const dayCaption = date === localToday() ? "Today's orders" : `Orders on ${orderDate(date)}`

  const tabs: { key: KitchenDashboardStatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats?.statusCounts.all ?? 0 },
    { key: 'pending', label: 'Pending Orders', count: stats?.statusCounts.pending ?? 0 },
    { key: 'completed', label: 'Completed Orders', count: stats?.statusCounts.completed ?? 0 },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-text!">
          <ChartLine size={24} className="text-text-muted" /> Kitchen Dashboard
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={ROUTES.kitchenOrderManagement} className="flex h-10 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-sm font-medium text-text! shadow-sm hover:bg-surface-hover">
            <ListChecks size={15} /> Order Management
          </Link>
          <Link to={ROUTES.kitchenCreateOrder} className="flex h-10 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-sm font-medium text-text! shadow-sm hover:bg-surface-hover">
            <Plus size={15} /> New Order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <StatCard label="Total Orders" caption={dayCaption} value={statsLoading ? 0 : stats?.totalOrders ?? 0} icon={Receipt} />
        <StatCard label="Active Orders" caption="Orders in progress" value={statsLoading ? 0 : stats?.active ?? 0} icon={Clock} />
        <StatCard label="Completed Orders" caption="Finished orders" value={statsLoading ? 0 : stats?.completed ?? 0} icon={CheckCheck} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-text!">
          <Ticket size={22} className="text-text-muted" /> Token Status Overview
        </h3>
        <label className="flex flex-col items-end gap-1 text-sm font-medium text-text!">
          Select Date:
          <span className="flex">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-9 w-56 rounded-l-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30 sm:w-80"
            />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={statsFetching}
              className="flex h-9 items-center gap-1.5 rounded-r-md bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={statsFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </span>
        </label>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = status === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold uppercase ${active ? 'border-brand text-brand' : 'border-transparent text-text! hover:text-brand'}`}
            >
              {t.label} ({t.count})
            </button>
          )
        })}
      </div>

      {deleteError && <p className="text-sm text-danger-fg">{deleteError}</p>}

      {tokensLoading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-text-faint">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : !tokens || tokens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-text-faint">
          <Inbox size={52} className="opacity-40" />
          <p className="text-sm">No orders found for this status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tokens.map((t) => (
            <div key={t.id} onClick={() => setViewOrderId(t.id)} className="cursor-pointer overflow-hidden rounded-lg border border-border bg-surface-alt transition-shadow hover:border-brand hover:shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
                <div>
                  <h5 className="text-lg font-bold text-text!">#{t.tokenNo}</h5>
                  <p className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock size={11} /> {t.timeElapsed}
                  </p>
                </div>
                {t.isDraft && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(t.id, t.ref)
                    }}
                    title="Delete draft order"
                    className="grid h-8 w-8 place-items-center rounded-md bg-danger text-white hover:opacity-90"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <ul className="divide-y divide-border text-sm">
                <li className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <strong className="text-text!">Ref:</strong> <span className="text-text-muted">{t.ref}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <strong className="text-text!">Table:</strong> <span className="text-text-muted">{t.table || 'N/A'}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <strong className="text-text!">Order Status:</strong>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${t.completed ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>{t.completed ? 'Completed Order' : 'Active Order'}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <strong className="text-text!">Items:</strong> <span className="text-text-muted">{t.totalItems}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <strong className="text-text!">Amount:</strong> <span className="text-text-muted tabular-nums">{t.amount}</span>
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}

      {viewOrderId != null && <OrderDetailsModal orderId={viewOrderId} onClose={() => setViewOrderId(null)} />}
    </div>
  )
}
