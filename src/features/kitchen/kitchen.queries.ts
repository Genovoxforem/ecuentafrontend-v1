import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { stripTags } from '../../utils/text'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// Via kitchen/order_ajax_list.php (JSON). "Kitchen order tracking" isn't a
// dedicated feature with its own table — it's POS invoices (llx_facture
// with pos_source set) whose lines carry a kotstatus column, and this
// endpoint queries that directly. "Kitchen Orders" and "Beverage Orders"
// are the SAME endpoint, just filtered by btype=supplement for beverages
// (matching the legacy menu's own two URLs, /kitchen/ordermanagement.php
// vs ?type=supplement) — not two different backends.
//
// The richer "Kitchen Order Management" screen (kitchen/ordermanagement.php)
// posts to this SAME endpoint with 7 extra filter params, all applied as
// SQL LIKE clauses (from order_ajax_list.php's own WHERE-clause
// construction):
//   filterDate         -> f.datef LIKE
//   filterToken        -> f.tokenno LIKE
//   filterCity         -> s.town LIKE
//   filterThirdParty   -> s.nom LIKE
//   filterPaymentType  -> f.fk_mode_reglement LIKE (matches the id, not a
//                         label — a legacy quirk; the classic page's own
//                         "Search Payment Type" filter is a plain text
//                         input despite this, so replicated as-is)
//   filterOrderStatus  -> f.orderstatus LIKE (enum: pending/received/
//                         preparing/ready_to_serve/served/cancelled)
//   filterCompleted    -> f.ordercomplete LIKE ('0' or '1')
//
// Column names in the raw response are misleading leftovers from a
// copy-pasted invoice-list template (same pattern as
// salesoredr_ajax_list.php), mapped from this file's own $data[] assignment:
//   cust_name    -> order ref (HTML link)
//   currency     -> order date, already formatted "MM/DD/YYYY"
//   typent_code  -> customer name (HTML link)
//   contact      -> town/city
//   cust_type    -> Payment Type label (HTML via form_modes_reglement_listpage)
//   tot_amount   -> total HT, plain numeric string
//   author       -> user login (HTML link)
//   status       -> invoice status badge (HTML)
//   orderstatus  -> "<total> (<pending>)" + an info icon whose data-geo
//                   attribute holds the per-item prep breakdown
//                   ("Total Items: X<br>Pending Items: Y<br>Completed
//                   Items: Z<br>Preparing Items: W") — this IS the classic
//                   page's own "Order Status" column, parsed out below
//   ordercomplete -> a <select name="order_complete"> with the
//                   currently-selected Yes(1)/No(0) option marked via a
//                   PHP ternary — parsed out below into a plain boolean
//   tableno      -> floor/table label (HTML), when the order has one
//   dropdown     -> the classic page's "Action" column: a "View" button that
//                   opens order_details.php in an offcanvas. That endpoint
//                   returns an HTML fragment (not JSON) and, as a side
//                   effect of its own GET handler, runs `UPDATE facture SET
//                   orderstatus = 1` on every view. Not wired here; left as
//                   a disabled action (see KitchenOrdersList.tsx) rather
//                   than scraping a mutating HTML endpoint.
//
// This endpoint's own iTotalRecords/iTotalDisplayRecords are swapped from
// the usual DataTables convention: iTotalRecords is just the current page's
// row count (from the LIMIT-ed query), while iTotalDisplayRecords is the
// filtered total (from the pre-LIMIT count query) — the same swapped-fields
// bug as fourn/facture/facture_ajax_list.php's invtype=pending path.
//
// No permission check exists on this endpoint server-side — reported, not
// fixed, per frontend-only scope.

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

// The Order Status filter comes from kitchen/fapi/form_options.php (key-authenticated JSON, 6 Nov 2026); the classic Order Management page
// (kitchen/ordermanagement.php, ?type=supplement for beverages) is the fallback for a backend without it. Read on newecuenta and compared with the classic
// page: both give the same six statuses (pending, received, preparing, ready_to_serve, served, cancelled) but the API lists them as Pending, Preparing,
// Ready To Serve, Served, Cancelled, Received (the classic page: Pending, Received, Preparing, Ready_to_serve, Served, Cancelled - its last-but-two label is a raw
// key), and its answer is the same for the Beverage page. The endpoint also gives floors (1-4), tables (134), waiters (3) and kotstatus_in_use, which the
// classic filter row does not have, so they are not used. The page title and the "Completed Status" (Yes / No) select are not in the answer: they are the
// classic page's own words ("Kitchen Order Management" / "Beverage Order Management", "Select Order Status", "Completed Status", Yes = 1, No = 0).
export interface KitchenFilterOptions {
  title: string
  orderStatus: { value: string; label: string }[] // first entry is the "Select Order Status" placeholder
  completed: { value: string; label: string }[] // first entry is the "Completed Status" placeholder
}

const KITCHEN_TITLES = { kitchen: 'Kitchen Order Management', beverage: 'Beverage Order Management' } as const

export function kitchenOptionsFromFapi(d: { order_statuses?: Array<{ value: string; label: string }> }, kind: 'kitchen' | 'beverage'): KitchenFilterOptions {
  const statuses = d.order_statuses ?? []
  if (statuses.length === 0) throw new Error('The order filters were not found in the backend answer.')
  return {
    title: KITCHEN_TITLES[kind],
    orderStatus: [{ value: '', label: 'Select Order Status' }, ...statuses.map((x) => ({ value: x.value, label: x.label }))],
    completed: [
      { value: '', label: 'Completed Status' },
      { value: '1', label: 'Yes' },
      { value: '0', label: 'No' },
    ],
  }
}

export function useKitchenFilterOptions(kind: 'kitchen' | 'beverage') {
  return useQuery({
    queryKey: ['kitchen', 'filterOptions', kind],
    // kitchen/fapi/form_options.php (the classic page is no longer read for the filter options)
    queryFn: async (): Promise<KitchenFilterOptions> => kitchenOptionsFromFapi(await fapiGet<{ order_statuses?: Array<{ value: string; label: string }> }>('/kitchen/fapi/form_options.php'), kind),
    staleTime: 10 * 60_000,
  })
}

export interface KitchenOrdersFilters {
  date: string
  token: string
  thirdParty: string
  city: string
  paymentType: string
  orderStatus: string
  completed: string
}

async function fetchKitchenOrdersLegacy(kind: 'kitchen' | 'beverage', filters: KitchenOrdersFilters, page: number, perPage: number): Promise<{ items: KitchenOrderRow[]; total: number }> {
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
}

// kitchen/fapi/orders.php: the kitchen queue as JSON (POS invoices with a kitchen status derived from each line's
// kotstatus). Items carry payment_type (c_paiement label) and city (customer town) since 17 Nov 2026 (AN-167, 6cccd1a0).
// Beverage filter (kind=beverage) and per-order lines[] remain classic/open on AN-167.
interface FapiKitchenOrder {
  id: number
  ref?: string
  token?: string
  table?: { label?: string; floor?: string } | null
  party?: { name?: string; town?: string } | null
  waiter?: string
  items?: { total?: number; served?: number; preparing?: number; pending?: number }
  order_complete?: number
  invoice_status?: number
  paid?: number
  total_ht?: number
  date?: number
  payment_type?: string
  city?: string
}

const INVOICE_STATUS = ['Draft', 'Not paid', 'Paid', 'Abandoned']
const pad2 = (n: number) => String(n).padStart(2, '0')

async function fetchKitchenOrdersFapi(filters: KitchenOrdersFilters, page: number, perPage: number): Promise<{ items: KitchenOrderRow[]; total: number }> {
  const d = await fapiGet<{ items?: FapiKitchenOrder[]; pagination?: { total?: number } }>('/kitchen/fapi/orders.php', {
    page,
    limit: perPage,
    date: filters.date || undefined,
    token: filters.token || undefined,
    search: filters.thirdParty || undefined,
    order_status: filters.orderStatus || undefined,
    completed: filters.completed || undefined,
  })
  const items = (d.items ?? []).map((o): KitchenOrderRow => {
    const day = o.date ? new Date(o.date * 1000) : null
    return {
      id: o.id,
      ref: o.ref ?? '',
      date: day ? `${pad2(day.getUTCMonth() + 1)}/${pad2(day.getUTCDate())}/${day.getUTCFullYear()}` : '',
      customer: o.party?.name ?? '',
      city: o.city || o.party?.town || '',
      tokenNo: o.token ?? '',
      paymentType: o.payment_type ?? '',
      totalHt: String(o.total_ht ?? ''),
      author: o.waiter ?? '',
      status: o.paid ? 'Paid' : (INVOICE_STATUS[o.invoice_status ?? -1] ?? ''),
      table: [o.table?.floor, o.table?.label].filter(Boolean).join(' '),
      completed: o.order_complete === 1,
      totalItems: o.items?.total ?? 0,
      pendingItems: o.items?.pending ?? 0,
      completedItems: o.items?.served ?? 0,
      preparingItems: o.items?.preparing ?? 0,
    }
  })
  return { items, total: Number(d.pagination?.total) || 0 }
}

export function useKitchenOrders(kind: 'kitchen' | 'beverage', filters: KitchenOrdersFilters, page: number, perPage: number) {
  return useQuery({
    queryKey: ['kitchen', 'orders', kind, filters, page, perPage],
    queryFn: () =>
      // Kitchen orders: kitchen/fapi/orders.php only. Beverage (supplement) orders still read the classic page: the fapi has no beverage switch (AN-167).
      kind === 'kitchen' ? fetchKitchenOrdersFapi(filters, page, perPage) : fetchKitchenOrdersLegacy(kind, filters, page, perPage),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}

// kitchen/fapi/order_status.php?action=complete (13 Nov 2026, #392; replaces the raw-SQL kitchen/order_status_change.php): sets facture.ordercomplete
// through the ORM with a paid-invoice guard (an unpaid order is refused with 409 and a message, as the old handler refused it). The body needs order_id
// (422 "order_id is required" read live); the name of the Yes/No field is not in the answers seen, so the value goes under both `complete` and
// `order_complete`, the names the endpoint and the old handler use. Set / restore on a real order was reported by the backend (not run from this app).
// The same file's ?action=set_status (line_id + status: pending, received, preparing, ready_to_serve, served) has no control on these screens.
export function useSetKitchenOrderComplete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, complete }: { orderId: number; complete: boolean }) =>
      fapiPost('/kitchen/fapi/order_status.php', { order_id: orderId, complete: complete ? 1 : 0, order_complete: complete ? 1 : 0 }, { action: 'complete' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen', 'orders'] })
    },
  })
}
