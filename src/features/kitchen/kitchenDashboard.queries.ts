import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real via kitchen/dashboard_ajax.php — a genuinely different real page
// from kitchen/ordermanagement.php (which KitchenOrdersList.tsx already
// covers). Confirmed live by reading it directly, not guessed:
//   - get_stats: only total_orders/pending/completed are ever computed —
//     the response also carries received/preparing/ready_to_serve/served/
//     cancelled keys, but the real page's own JS never reads them either
//     (dashboard.php's renderStats() only ever touches those 3 fields), so
//     they're left out here rather than surfaced as permanently-zero,
//     misleading stat cards.
//   - get_tokens: real per-order cards for the selected date, optionally
//     filtered to ordercomplete=0 ("pending") or =1 ("completed") — there's
//     no real per-KOT-status breakdown despite the "all" tab existing.
//   - get_invoice_details: real order + line items (with kotstatus) for
//     the "View" click.
//   - delete_order: real, but self-guards server-side to draft invoices
//     only (fk_statut = 0) — rejects anything else with a real message.
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

export function useKitchenDashboardStats(date: string) {
  return useQuery({
    queryKey: ['kitchenDashboard', 'stats', date],
    queryFn: async (): Promise<KitchenDashboardStats> => {
      const data = await postForm<{
        stats: { total_orders: number; pending: number; completed: number }
        status_counts: { all: number; pending: number; completed: number }
      }>({ action: 'get_stats', date })
      return {
        totalOrders: data.stats.total_orders,
        active: data.stats.pending,
        completed: data.stats.completed,
        statusCounts: data.status_counts,
      }
    },
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

export function useKitchenOrderDetails(orderId: number | null) {
  return useQuery({
    queryKey: ['kitchenDashboard', 'orderDetails', orderId],
    queryFn: async (): Promise<{ order: { rowid: number; ref: string; tokenno: string; total_ttc: number; ordercomplete: number; customer_name: string } | null; items: KitchenDashboardOrderItem[] }> => {
      const data = await postForm<{
        order: { rowid: number; ref: string; tokenno: string; total_ttc: number; ordercomplete: number; customer_name: string } | null
        items: Array<{ rowid: number; description: string; product_ref: string; product_label: string; qty: number; total_ht: number; total_ttc: number; kotstatus: string }>
      }>({ action: 'get_invoice_details', order_id: String(orderId) })
      return {
        order: data.order,
        items: (data.items ?? []).map((i) => ({
          id: i.rowid,
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
