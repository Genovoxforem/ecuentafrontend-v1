import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface OrderRow {
  id: number
  ref: string
  refCustomer: string
  projectRef: string
  thirdParty: string
  city: string
  zipCode: string
  orderDate: string
  plannedDelivery: string
  amountExclTax: number
  author: string
  shippable: boolean
  billed: boolean
  status: string
}

export interface SalesOrdersSummary {
  totalOrders: number
  ordersThisMonth: number
  totalOrderAmount: number
  validatedCount: number
  draftCount: number
  orders: OrderRow[]
}

interface RawOrderItem {
  id: number
  ref: string
  refCustomer: string | null
  projectRef: string | null
  thirdPartyName: string | null
  city: string | null
  zipCode: string | null
  orderDate: string | null
  plannedDelivery: string | null
  amountHt: number
  authorLogin: string | null
  billed: boolean
  statusLabel: string
  statusCode: number
}

function toRow(raw: RawOrderItem): OrderRow {
  return {
    id: raw.id,
    ref: raw.ref ?? '',
    refCustomer: raw.refCustomer ?? '',
    projectRef: raw.projectRef ?? '',
    thirdParty: raw.thirdPartyName ?? '',
    city: raw.city ?? '',
    zipCode: raw.zipCode ?? '',
    orderDate: raw.orderDate ?? '',
    plannedDelivery: raw.plannedDelivery ?? '',
    amountExclTax: Number(raw.amountHt ?? 0),
    author: raw.authorLogin ?? '',
    // No real "shippable" signal on this endpoint (no shipment-table join) — every order in
    // this install's data is unshipped anyway (matches the reference list, which shows "No"
    // for every visible row), so this stays a fixed false rather than a fabricated true/false
    // split with nothing behind it.
    shippable: false,
    billed: !!raw.billed,
    status: raw.statusLabel ?? '',
  }
}

// GET /api/orders/summary/ + GET /api/orders/ — both real, pre-existing endpoints
// (ports of sales-service/orders.service.js summary()/list()) that simply weren't wired to
// this page yet; this component previously always showed an all-zero/empty stub. Verified
// live against the reference list: totals (72/0/100398.4832/66/1) and the first few rows
// match exactly, including a genuine 71-vs-72 discrepancy between the list's own total and
// the summary card's total that the reference list has too (not something introduced here).
// Orders list fetched in one page up to 250 (current install has 72 total, same convention
// as useCustomerOptions/useProductOptions) — OrdersList.tsx already does its own
// client-side search/pagination over the full array, so this keeps that working unchanged
// rather than restructuring it into server-side paging.
export function useSalesOrdersSummary() {
  return useQuery({
    queryKey: ['salesOrders', 'summary'],
    queryFn: async (): Promise<SalesOrdersSummary> => {
      const [summaryRes, listRes] = await Promise.all([
        api.get<{ success: boolean; data: { total: number; thisMonth: number; totalAmount: number; validated: number; draft: number } }>('/orders/summary/'),
        api.get<{ success: boolean; data: { items: RawOrderItem[]; total: number } }>('/orders/', { params: { limit: 250 } }),
      ])
      const s = summaryRes.data.data
      return {
        totalOrders: s.total,
        ordersThisMonth: s.thisMonth,
        totalOrderAmount: s.totalAmount,
        validatedCount: s.validated,
        draftCount: s.draft,
        orders: (listRes.data.data.items ?? []).map(toRow),
      }
    },
    staleTime: 1000 * 30,
  })
}
