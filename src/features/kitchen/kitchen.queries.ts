import { useQuery } from '@tanstack/react-query'

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
// Column names in the raw response are misleading leftovers from a
// copy-pasted invoice-list template (same pattern already seen this
// session in salesoredr_ajax_list.php) — verified directly against this
// file's own $data[] assignment, not guessed:
//   cust_name    -> order ref (HTML link)
//   currency     -> order date, already formatted "MM/DD/YYYY"
//   typent_code  -> customer name (HTML link)
//   contact      -> town
//   tot_amount   -> total HT, plain numeric string
//   author       -> user login (HTML link)
//   status       -> invoice status badge (HTML)
//   orderstatus  -> "<total> (<pending>)" + an info icon whose data-geo
//                   attribute holds the real per-item prep breakdown
//                   ("Total Items: X<br>Pending Items: Y<br>Completed
//                   Items: Z<br>Preparing Items: W") — parsed out below
//   tableno      -> real floor/table label (HTML), when the order has one
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
  town: string
  tokenNo: string
  totalHt: string
  author: string
  status: string
  table: string
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
  tot_amount: string
  author: string
  status: string
  orderstatus: string
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

export function useKitchenOrders(kind: 'kitchen' | 'beverage') {
  return useQuery({
    queryKey: ['kitchen', 'orders', kind],
    queryFn: async (): Promise<KitchenOrderRow[]> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '100' })
      if (kind === 'beverage') body.set('btype', 'supplement')
      const res = await fetch('/kitchen/order_ajax_list.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawKitchenListResponse = await res.json()
      return data.aaData.map((r) => {
        const counts = parseItemCounts(r.orderstatus)
        return {
          id: r.order_id,
          ref: stripTags(r.cust_name),
          date: r.currency,
          customer: stripTags(r.typent_code),
          town: r.contact || '',
          tokenNo: r.tokenno || '',
          totalHt: r.tot_amount,
          author: stripTags(r.author),
          status: stripTags(r.status),
          table: stripTags(r.tableno),
          totalItems: counts.total,
          pendingItems: counts.pending,
          completedItems: counts.completed,
          preparingItems: counts.preparing,
        }
      })
    },
    refetchInterval: 30_000,
  })
}
