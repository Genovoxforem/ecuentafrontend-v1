import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { PO_BASE } from './purchaseOrderFapi'
import { parseUsDate } from './purchaseOrderTypes'

export interface PurchaseOrderRow {
  id: number | null
  ref: string
  refOrderVendor: string
  requestAuthor: string
  thirdParty: string
  socid: number | null
  city: string
  zipCode: string
  orderDate: string
  plannedDelivery: string
  amountExclTax: number
  status: string
  statusCode: number | null
  billed: boolean
  // From fourn/commande/fapi/list.php (dispatch table); undefined on the classic list.
  qtyOrdered?: number
  qtyReceived?: number
  hasReceipts?: boolean
}

export interface PurchaseOrdersSummary {
  totalOrders: number
  ordersThisMonth: number
  totalPurchaseAmount: number
  approvedCount: number
  pendingCount: number
  orders: PurchaseOrderRow[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// 'YYYY-MM-DD[ HH:MM]' from the API, as the US date the list's own sorting and filters read.
function usDate(value: unknown): string {
  const m = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

// GET fourn/commande/fapi/list.php: real status codes, the supplier as an object, qty ordered / received
// and a summary of counts and amounts by status computed with the status filter removed. Pages of up to
// 100 are read until the whole list is in (the page sorts, filters and paginates it locally).
async function fetchFromFapi(): Promise<PurchaseOrdersSummary> {
  const items: any[] = []
  let summary: any = null
  let pages = 1
  for (let page = 1; page <= pages && page <= 50; page += 1) {
    const d = await fapiGet<any>(`${PO_BASE}/list.php`, { page, limit: 100, sort: 'date', direction: 'desc' })
    summary ??= d.summary
    pages = d.pages ?? 1
    items.push(...(d.items ?? []))
  }
  const orders: PurchaseOrderRow[] = items.map((o) => ({
    id: Number(o.id) || null,
    ref: o.ref ?? '',
    refOrderVendor: o.ref_supplier ?? '',
    requestAuthor: o.author?.name ?? o.author?.login ?? '',
    thirdParty: o.supplier?.name ?? '',
    socid: o.supplier?.id != null ? Number(o.supplier.id) : null,
    city: o.supplier?.town ?? '',
    zipCode: '',
    orderDate: usDate(o.date_order) || usDate(o.date_creation),
    plannedDelivery: usDate(o.date_delivery),
    amountExclTax: Number(o.total_ht) || 0,
    status: o.status_label ?? '',
    statusCode: o.status == null ? null : Number(o.status),
    billed: Boolean(Number(o.billed)),
    qtyOrdered: Number(o.qty_ordered) || 0,
    qtyReceived: Number(o.qty_received) || 0,
    hasReceipts: (Number(o.qty_received) || 0) > 0,
  }))
  const now = new Date()
  const ordersThisMonth = orders.filter((r) => {
    const d = parseUsDate(r.orderDate)
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  return {
    totalOrders: Number(summary?.count) || orders.length,
    ordersThisMonth,
    totalPurchaseAmount: Number(summary?.total_amount_ht) || orders.reduce((sum, r) => sum + r.amountExclTax, 0),
    approvedCount: Number(summary?.count_by_status?.['2']) || 0,
    pendingCount: Number(summary?.count_by_status?.['1']) || 0,
    orders,
  }
}

export function usePurchaseOrdersSummary() {
  return useQuery({
    queryKey: ['purchaseOrders', 'list'],
    queryFn: (): Promise<PurchaseOrdersSummary> => fetchFromFapi(),
    staleTime: 1000 * 30,
  })
}
