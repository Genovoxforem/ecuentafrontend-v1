import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'

export interface PurchaseOrderRow {
  ref: string
  refOrderVendor: string
  requestAuthor: string
  thirdParty: string
  city: string
  zipCode: string
  orderDate: string
  plannedDelivery: string
  amountExclTax: number
  status: string
  billed: boolean
}

export interface PurchaseOrdersSummary {
  totalOrders: number
  ordersThisMonth: number
  totalPurchaseAmount: number
  approvedCount: number
  pendingCount: number
  orders: PurchaseOrderRow[]
}

const SEED: PurchaseOrdersSummary = {
  totalOrders: 0,
  ordersThisMonth: 0,
  totalPurchaseAmount: 0,
  approvedCount: 0,
  pendingCount: 0,
  orders: [],
}

const KEY = ['local', 'purchaseOrders'] as const

// No backend endpoint exists for purchase orders on this app's server
// (confirmed: fourn/commande/list has no equivalent route). Held in
// react-query's cache only — see shared/localCollection.ts — so creating
// one here feels real in the browser but never persists anywhere.
export function usePurchaseOrdersSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

export interface NewPurchaseOrderInput {
  thirdParty: string
  refOrderVendor?: string
  plannedDelivery?: string
  amountExclTax: number
  author: string
}

export function useCreatePurchaseOrder() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  return (input: NewPurchaseOrderInput) => {
    const row: PurchaseOrderRow = {
      ref: nextLocalRef('(PROV-CO)'),
      refOrderVendor: input.refOrderVendor ?? '',
      requestAuthor: input.author,
      thirdParty: input.thirdParty,
      city: '',
      zipCode: '',
      orderDate: todayIso(),
      plannedDelivery: input.plannedDelivery ?? '',
      amountExclTax: input.amountExclTax,
      status: 'Pending',
      billed: false,
    }
    update((current) => ({
      ...current,
      totalOrders: current.totalOrders + 1,
      ordersThisMonth: current.ordersThisMonth + 1,
      totalPurchaseAmount: current.totalPurchaseAmount + input.amountExclTax,
      pendingCount: current.pendingCount + 1,
      orders: [row, ...current.orders],
    }))
    logActivity({ label: `New purchase order ${row.ref} from ${row.thirdParty}`, category: 'purchase', authorName: input.author })
  }
}
