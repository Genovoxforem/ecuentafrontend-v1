import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// Via kitchen/dashboard_ajax.php — a different page from
// kitchen/ordermanagement.php (which KitchenOrdersList.tsx covers):
//   - get_stats: only total_orders/pending/completed are ever computed —
//     the response also carries received/preparing/ready_to_serve/served/
//     cancelled keys, but the classic page's own JS never reads them either
//     (dashboard.php's renderStats() only ever touches those 3 fields), so
//     they're left out here rather than surfaced as permanently-zero,
//     misleading stat cards.
//   - get_tokens: per-order cards for the selected date, optionally
//     filtered to ordercomplete=0 ("pending") or =1 ("completed") — there's
//     no per-KOT-status breakdown despite the "all" tab existing.
//   - get_invoice_details: order + line items (with kotstatus) for the
//     "View" click.
//   - delete_order: self-guards server-side to draft invoices only
//     (fk_statut = 0) — rejects anything else with a message.
async function postForm<T>(body: Record<string, string>): Promise<T> {
  const res = await fetch('/kitchen/dashboard_ajax.php', { method: 'POST', credentials: 'same-origin', body: new URLSearchParams(body) })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.json()
}

export interface KitchenDashboardStats {
  totalOrders: number
  active: number
  completed: number
  statusCounts: { all: number; pending: number; completed: number }
}

// kitchen/fapi/dashboard.php?date=: its "pending" means any line unserved, while the classic cards count orders not
// yet completed (ordercomplete=0), so active / pending here is total minus completed to keep the card's meaning.
async function fetchStatsFapi(date: string): Promise<KitchenDashboardStats> {
  const d = await fapiGet<{ stats: { total_orders?: number; completed?: number } }>('/kitchen/fapi/dashboard.php', { date })
  const total = Number(d.stats?.total_orders) || 0
  const completed = Number(d.stats?.completed) || 0
  return { totalOrders: total, active: total - completed, completed, statusCounts: { all: total, pending: total - completed, completed } }
}

export function useKitchenDashboardStats(date: string) {
  return useQuery({
    queryKey: ['kitchenDashboard', 'stats', date],
    queryFn: () => fetchStatsFapi(date),
    refetchInterval: 30_000,
  })
}

export type KitchenDashboardStatusFilter = 'all' | 'pending' | 'completed'

export interface KitchenDashboardToken {
  id: number
  ref: string
  tokenNo: string
  table: string
  totalItems: number
  amount: string
  timeElapsed: string
  customer: string
  completed: boolean
  isDraft: boolean
}

export function useKitchenDashboardTokens(status: KitchenDashboardStatusFilter, date: string) {
  return useQuery({
    queryKey: ['kitchenDashboard', 'tokens', status, date],
    queryFn: async (): Promise<KitchenDashboardToken[]> => {
      const data = await postForm<
        | Array<{
            id: number
            ref: string
            tokenno: string
            table: string
            total_items: number
            amount: string
            time_elapsed: string
            customer: string
            ordercomplete: number
            fk_statut: number
          }>
        | { error: string }
      >({ action: 'get_tokens', status, date })
      if (!Array.isArray(data)) throw new Error(data.error || 'Could not load orders.')
      return data.map((t) => ({
        id: t.id,
        ref: t.ref,
        tokenNo: t.tokenno || t.ref,
        table: t.table && t.table !== 'N/A' ? t.table : '',
        totalItems: t.total_items,
        amount: t.amount,
        timeElapsed: t.time_elapsed,
        customer: t.customer || '',
        completed: t.ordercomplete === 1,
        isDraft: t.fk_statut === 0,
      }))
    },
    refetchInterval: 30_000,
  })
}

export interface KitchenDashboardOrderItem {
  id: number
  description: string
  productRef: string
  productLabel: string
  qty: number
  totalHt: number
  totalTtc: number
  kotstatus: string
}

export interface KitchenDashboardOrder {
  rowid: number
  ref: string
  tokenno: string
  datef: string // the order date, as the backend prints it (yyyy-mm-dd)
  total_ttc: number
  ordercomplete: number
  customer_name: string
}

export function useKitchenOrderDetails(orderId: number | null) {
  return useQuery({
    queryKey: ['kitchenDashboard', 'orderDetails', orderId],
    queryFn: async (): Promise<{ order: KitchenDashboardOrder | null; items: KitchenDashboardOrderItem[] }> => {
      // Live: numbers arrive as strings, and each line's id is `id` (not `rowid`).
      const data = await postForm<{
        order: KitchenDashboardOrder | null
        items: Array<{ id?: number | string; rowid?: number | string; description: string; product_ref: string; product_label: string; qty: number; total_ht: number; total_ttc: number; kotstatus: string }>
      }>({ action: 'get_invoice_details', order_id: String(orderId) })
      return {
        order: data.order,
        items: (data.items ?? []).map((i) => ({
          id: Number(i.id ?? i.rowid),
          description: i.description,
          productRef: i.product_ref,
          productLabel: i.product_label,
          qty: Number(i.qty),
          totalHt: Number(i.total_ht),
          totalTtc: Number(i.total_ttc),
          kotstatus: i.kotstatus,
        })),
      }
    },
    enabled: orderId != null,
  })
}

export function useDeleteDraftOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: number) => {
      const data = await postForm<{ success: boolean; message: string }>({ action: 'delete_order', order_id: String(orderId) })
      if (!data.success) throw new Error(data.message || 'Could not delete this order.')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenDashboard'] })
    },
  })
}
