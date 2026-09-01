import { Utensils, Coffee } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useKitchenOrders } from '../kitchen.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Real via kitchen/order_ajax_list.php — see kitchen.queries.ts's header
// comment for the full column-mapping evidence and the live security gap
// (no permission check on this endpoint).
export function KitchenOrdersList({ kind }: { kind: 'kitchen' | 'beverage' }) {
  const { data: orders, isLoading, isError, error, refetch } = useKitchenOrders(kind)
  const Icon = kind === 'beverage' ? Coffee : Utensils

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {kind === 'beverage' ? 'Beverage Orders' : 'Kitchen Orders'}
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading orders…" />}
      {isError && <LegacyErrorCard title="Couldn't load orders" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {orders && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Ref</th>
                <th className="font-medium px-3 py-2">Date</th>
                <th className="font-medium px-3 py-2">Customer</th>
                <th className="font-medium px-3 py-2">Table</th>
                <th className="font-medium px-3 py-2">Token</th>
                <th className="font-medium px-3 py-2 text-right">Total</th>
                <th className="font-medium px-3 py-2">Items</th>
                <th className="font-medium px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
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
      )}
    </div>
  )
}
