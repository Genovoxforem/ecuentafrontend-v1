import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Receipt, Clock, CheckCheck, ListChecks, Plus, RefreshCw, Trash2, X, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { todayIso } from '../../../shared/localCollection'
import { ROUTES } from '../../../routes'
import {
  useKitchenDashboardStats,
  useKitchenDashboardTokens,
  useKitchenOrderDetails,
  useDeleteDraftOrder,
  type KitchenDashboardStatusFilter,
} from '../kitchenDashboard.queries'

function StatCard({ label, caption, value, icon: Icon, color }: { label: string; caption: string; value: number; icon: typeof Receipt; color: string }) {
  return (
    <Card className="!h-auto flex items-center gap-3">
      <span className={`shrink-0 w-11 h-11 rounded-lg grid place-items-center ${color}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-text!">{value}</p>
        <p className="text-xs text-text-faint">{caption}</p>
      </div>
    </Card>
  )
}

function OrderDetailsModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { data, isLoading } = useKitchenOrderDetails(orderId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-auto rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Order Details</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text!">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-text-faint gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : !data?.order ? (
            <p className="text-sm text-text-faint italic">Order not found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <p className="text-text-muted">Ref</p>
                <p className="text-text! font-medium">{data.order.ref}</p>
                <p className="text-text-muted">Token</p>
                <p className="text-text!">{data.order.tokenno || '—'}</p>
                <p className="text-text-muted">Customer</p>
                <p className="text-text!">{data.order.customer_name || '—'}</p>
                <p className="text-text-muted">Total (Incl. Tax)</p>
                <p className="text-text! font-semibold">{Number(data.order.total_ttc).toFixed(2)} ZMW</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 pl-3">KOT Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-text-faint italic">
                        No items.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((i) => (
                      <tr key={i.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 text-text!">{i.productLabel || i.description}</td>
                        <td className="py-2 px-3 text-right text-text-muted tabular-nums">{i.qty}</td>
                        <td className="py-2 px-3 text-right text-text! tabular-nums">{i.totalTtc.toFixed(2)}</td>
                        <td className="py-2 pl-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{i.kotstatus || 'Pending'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Real via kitchen/dashboard.php + kitchen/dashboard_ajax.php — a genuinely
// different real page from kitchen/ordermanagement.php (KitchenOrdersList,
// routed separately at kitchenOrderManagement). See
// kitchenDashboard.queries.ts for the full endpoint-by-endpoint evidence.
export function KitchenDashboardPage() {
  const [date, setDate] = useState(todayIso())
  const [status, setStatus] = useState<KitchenDashboardStatusFilter>('all')
  const [viewOrderId, setViewOrderId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useKitchenDashboardStats(date)
  const { data: tokens, isLoading: tokensLoading, refetch: refetchTokens } = useKitchenDashboardTokens(status, date)
  const deleteOrder = useDeleteDraftOrder()

  function handleRefresh() {
    refetchStats()
    refetchTokens()
  }

  function handleDelete(id: number, ref: string) {
    if (!window.confirm(`Delete draft order ${ref}? This can't be undone.`)) return
    setDeleteError('')
    deleteOrder.mutate(id, { onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Could not delete this order.') })
  }

  const tabs: { key: KitchenDashboardStatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats?.statusCounts.all ?? 0 },
    { key: 'pending', label: 'Pending Orders', count: stats?.statusCounts.pending ?? 0 },
    { key: 'completed', label: 'Completed Orders', count: stats?.statusCounts.completed ?? 0 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <LayoutDashboard size={20} className="text-brand" /> Kitchen Dashboard
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30" />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={statsFetching}
            className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text-muted text-sm font-medium hover:bg-surface-hover disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={statsFetching ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to={ROUTES.kitchenOrderManagement} className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text-muted text-sm font-medium hover:bg-surface-hover flex items-center gap-1.5">
            <ListChecks size={14} /> Order Management
          </Link>
          <Link to={ROUTES.kitchenCreateOrder} className="h-9 px-3 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover flex items-center gap-1.5">
            <Plus size={14} /> New Order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Orders" caption="Today's orders" value={statsLoading ? 0 : stats?.totalOrders ?? 0} icon={Receipt} color="bg-violet-500/15 text-violet-600" />
        <StatCard label="Active Orders" caption="Orders in progress" value={statsLoading ? 0 : stats?.active ?? 0} icon={Clock} color="bg-danger-bg text-danger-fg" />
        <StatCard label="Completed Orders" caption="Finished orders" value={statsLoading ? 0 : stats?.completed ?? 0} icon={CheckCheck} color="bg-success-bg text-success-fg" />
      </div>

      <Card className="!h-auto">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatus(t.key)}
              className={`px-3.5 py-2 rounded-md text-sm font-medium ${status === t.key ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted hover:bg-surface-hover'}`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {deleteError && <p className="text-sm text-danger-fg mb-3">{deleteError}</p>}

        {tokensLoading ? (
          <div className="flex items-center justify-center py-12 text-text-faint gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading orders…
          </div>
        ) : !tokens || tokens.length === 0 ? (
          <p className="text-center py-12 text-text-faint italic">No orders found for this status</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tokens.map((t) => (
              <div
                key={t.id}
                onClick={() => setViewOrderId(t.id)}
                className="relative cursor-pointer rounded-lg border border-border bg-surface-alt p-3 hover:border-brand hover:shadow-sm transition-shadow"
              >
                {t.isDraft && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(t.id, t.ref)
                    }}
                    title="Delete draft order"
                    className="absolute top-2 right-2 p-1 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <p className="text-xl font-bold text-text!">#{t.tokenNo}</p>
                <div className="text-xs text-text-muted mt-1 space-y-0.5">
                  <p>
                    <span className="font-medium text-text-faint">Ref:</span> {t.ref}
                  </p>
                  <p>
                    <span className="font-medium text-text-faint">Table:</span> {t.table || 'N/A'}
                  </p>
                  <p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium ${t.completed ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                      {t.completed ? 'Completed Order' : 'Active Order'}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-text-faint">Items:</span> {t.totalItems}
                  </p>
                  <p>
                    <span className="font-medium text-text-faint">Amount:</span> {t.amount}
                  </p>
                </div>
                <p className="text-[11px] text-text-faint mt-2 flex items-center gap-1">
                  <Clock size={11} /> {t.timeElapsed}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {viewOrderId != null && <OrderDetailsModal orderId={viewOrderId} onClose={() => setViewOrderId(null)} />}
    </div>
  )
}
