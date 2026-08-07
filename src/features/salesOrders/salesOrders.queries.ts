export interface OrderRow {
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

const STUB_SUMMARY: SalesOrdersSummary = {
  totalOrders: 0,
  ordersThisMonth: 0,
  totalOrderAmount: 0,
  validatedCount: 0,
  draftCount: 0,
  orders: [],
}

// Stubbed: the real version calls Dolibarr's commande/list stats (order
// counts, this-month count, total value, validated/draft breakdown, plus the
// order list itself). This project has no backend of its own, so it always
// reports the same all-zero/empty summary, matching the reference list on a
// fresh install with no orders yet.
export function useSalesOrdersSummary() {
  return { data: STUB_SUMMARY, isError: false, isLoading: false }
}
