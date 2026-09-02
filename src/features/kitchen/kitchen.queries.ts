import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'

// Real via kitchen/order_ajax_list.php — confirmed genuine JSON this
// session, replacing the entirely fake/local-only implementation this file
// used to have. "Kitchen order tracking" isn't a dedicated feature with its
// own table — it's POS invoices (llx_facture with pos_source set) whose
// lines carry a kotstatus column, and this endpoint queries that directly.
// "Kitchen Orders" and "Beverage Orders" are the SAME real endpoint, just
// filtered by btype=supplement for beverages (matching the real legacy
// menu's own two URLs, /kitchen/ordermanagement.php vs
// ?type=supplement) — not two different backends.
//
// The richer "Kitchen Order Management" screen (kitchen/ordermanagement.php)
// posts to this SAME endpoint with 7 extra real filter params, all applied
// as genuine SQL LIKE clauses (confirmed by reading order_ajax_list.php's
// own WHERE-clause construction, not guessed):
//   filterDate         -> f.datef LIKE
//   filterToken        -> f.tokenno LIKE
//   filterCity         -> s.town LIKE
//   filterThirdParty   -> s.nom LIKE
//   filterPaymentType  -> f.fk_mode_reglement LIKE (matches the id, not a
//                         label — a real legacy quirk; the real page's own
//                         "Search Payment Type" filter is a plain text
//                         input despite this, so replicated as-is)
//   filterOrderStatus  -> f.orderstatus LIKE (enum: pending/received/
//                         preparing/ready_to_serve/served/cancelled)
//   filterCompleted    -> f.ordercomplete LIKE ('0' or '1')
//
// Column names in the raw response are misleading leftovers from a
// copy-pasted invoice-list template (same pattern already seen this
// session in salesoredr_ajax_list.php) — verified directly against this
// file's own $data[] assignment, not guessed:
//   cust_name    -> order ref (HTML link)
//   currency     -> order date, already formatted "MM/DD/YYYY"
//   typent_code  -> customer name (HTML link)
//   contact      -> town/city
//   cust_type    -> Payment Type label (HTML via form_modes_reglement_listpage)
//   tot_amount   -> total HT, plain numeric string
//   author       -> user login (HTML link)
//   status       -> invoice status badge (HTML)
//   orderstatus  -> "<total> (<pending>)" + an info icon whose data-geo
//                   attribute holds the real per-item prep breakdown
//                   ("Total Items: X<br>Pending Items: Y<br>Completed
//                   Items: Z<br>Preparing Items: W") — this IS the real
//                   page's own "Order Status" column, parsed out below
//   ordercomplete -> a real <select name="order_complete"> with the
//                   currently-selected Yes(1)/No(0) option marked via a
//                   PHP ternary — parsed out below into a plain boolean
//   tableno      -> real floor/table label (HTML), when the order has one
//   dropdown     -> the real page's "Action" column: a "View" button that
//                   opens order_details.php in an offcanvas. That endpoint
//                   returns an HTML fragment (not JSON) and, as a side
//                   effect of its own GET handler, silently runs `UPDATE
//                   facture SET orderstatus = 1` on every view — confirmed
//                   by reading it directly. Per this app's real-API-only
//                   integration rule, not wired here; left as a disabled
//                   action (see KitchenOrdersList.tsx) rather than scraping
//                   a mutating HTML endpoint.
//
// This endpoint's own iTotalRecords/iTotalDisplayRecords are swapped from
// the usual DataTables convention — confirmed live: iTotalRecords is just
// the current page's row count (from the LIMIT-ed query), while
// iTotalDisplayRecords is the real filtered total (from the pre-LIMIT
// count query) — same swapped-fields bug already found and fixed this
// session on fourn/facture/facture_ajax_list.php's invtype=pending path.
//
// No permission check exists on this endpoint server-side (confirmed by
// reading it directly) — reported, not fixed, per frontend-only scope.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
}

export interface KitchenOrderRow {
  id: number
  ref: string
  date: string
  customer: string
  city: string
  tokenNo: string
  paymentType: string
  totalHt: string
  author: string
  status: string
  table: string
  completed: boolean
  totalItems: number
  pendingItems: number
  completedItems: number
  preparingItems: number
}
interface RawKitchenOrderRow {
  order_id: number
  cust_name: string
  currency: string
  typent_code: string
  contact: string
  tokenno: string
  cust_type: string
  tot_amount: string
  author: string
  status: string
  orderstatus: string
  ordercomplete: string
  tableno: string
}
interface RawKitchenListResponse {
  draw: number
  iTotalRecords: number
  iTotalDisplayRecords: number
  aaData: RawKitchenOrderRow[]
}

function parseItemCounts(orderstatusHtml: string): { total: number; pending: number; completed: number; preparing: number } {
  const m = /data-geo=['"]([^'"]*)['"]/.exec(orderstatusHtml)
  const tooltip = m ? decodeEntities(m[1]) : ''
  const grab = (label: string) => {
    const g = new RegExp(label + ':\\s*(\\d+)', 'i').exec(tooltip)
    return g ? Number(g[1]) : 0
  }
  return {
    total: grab('Total Items'),
    pending: grab('Pending Items'),
    completed: grab('Completed Items'),
    preparing: grab('Preparing Items'),
  }
}

// The real <select name="order_complete"> markup marks whichever option is
// current with a bare `selected` attribute via a PHP ternary — this reads
// that back out rather than guessing a default.
function parseOrderComplete(html: string): boolean {
  return /value="1"[^>]*selected/i.test(html)
}

export const KITCHEN_ORDER_STATUS_OPTIONS = [
  { value: '', label: 'Select Order Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Received' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready_to_serve', label: 'Ready_to_serve' },
  { value: 'served', label: 'Served' },
  { value: 'cancelled', label: 'Cancelled' },
]

export interface KitchenOrdersFilters {
  date: string
  token: string
  thirdParty: string
  city: string
  paymentType: string
  orderStatus: string
  completed: string
}

export function useKitchenOrders(kind: 'kitchen' | 'beverage', filters: KitchenOrdersFilters, page: number, perPage: number) {
  return useQuery({
    queryKey: ['kitchen', 'orders', kind, filters, page, perPage],
    queryFn: async (): Promise<{ items: KitchenOrderRow[]; total: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String((page - 1) * perPage), length: String(perPage) })
      if (kind === 'beverage') body.set('btype', 'supplement')
      if (filters.date) body.set('filterDate', filters.date)
      if (filters.token) body.set('filterToken', filters.token)
      if (filters.thirdParty) body.set('filterThirdParty', filters.thirdParty)
      if (filters.city) body.set('filterCity', filters.city)
      if (filters.paymentType) body.set('filterPaymentType', filters.paymentType)
      if (filters.orderStatus) body.set('filterOrderStatus', filters.orderStatus)
      if (filters.completed) body.set('filterCompleted', filters.completed)
      const res = await fetch('/kitchen/order_ajax_list.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawKitchenListResponse = await res.json()
      const items = data.aaData.map((r) => {
        const counts = parseItemCounts(r.orderstatus)
        return {
          id: r.order_id,
          ref: stripTags(r.cust_name),
          date: r.currency,
          customer: stripTags(r.typent_code),
          city: r.contact || '',
          tokenNo: r.tokenno || '',
          paymentType: stripTags(r.cust_type) || '',
          totalHt: r.tot_amount,
          author: stripTags(r.author),
          status: stripTags(r.status),
          table: stripTags(r.tableno),
          completed: parseOrderComplete(r.ordercomplete),
          totalItems: counts.total,
          pendingItems: counts.pending,
          completedItems: counts.completed,
          preparingItems: counts.preparing,
        }
      })
      return { items, total: Number(data.iTotalDisplayRecords) || 0 }
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}

// Real via kitchen/order_status_change.php's order_complete branch — a
// genuine JSON-returning mutation (unlike order_details.php's HTML-only
// GET), confirmed by reading it directly: it re-checks the invoice is
// actually paid server-side before allowing completion (rejects with
// require_payment:true otherwise), and updates llx_facture.ordercomplete.
export function useSetKitchenOrderComplete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, complete }: { orderId: number; complete: boolean }) => {
      const body = new URLSearchParams({ order_complete: complete ? '1' : '0', order_id: String(orderId) })
      const res = await fetch('/kitchen/order_status_change.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { success: boolean; message: string; require_payment?: boolean } = await res.json()
      if (!data.success) throw new Error(data.message || 'Could not update order completion status.')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen', 'orders'] })
    },
  })
}
