import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { parseOrderListRow, type RawOrderListRow } from './orderListParser'

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

function toRow(raw: RawOrderListRow): OrderRow {
  const parsed = parseOrderListRow(raw)
  return {
    id: parsed.id ?? 0,
    ref: parsed.ref,
    refCustomer: parsed.refCustomer,
    projectRef: parsed.projectRef,
    thirdParty: parsed.thirdParty,
    city: parsed.city,
    zipCode: parsed.zipCode,
    orderDate: parsed.orderDate,
    plannedDelivery: parsed.plannedDelivery,
    amountExclTax: parsed.amountExclTax,
    author: parsed.author,
    // The raw "shippable" cell is always a single blank space on this
    // deployment (see orderListParser.ts's header comment) — not fabricated,
    // it's a fixed false because the legacy page's own shippable calculation
    // never runs here either.
    shippable: false,
    billed: parsed.billed,
    status: parsed.statusLabel,
  }
}

// The old /api/orders/summary/ and /api/orders/ endpoints this hook used to
// call are a genuine 404 on this backend (Apache itself can't find a route —
// confirmed live, unlike /api/products/ or /api/customers/ which 401 for a
// missing API key). The real data source is commande/salesoredr_ajax_list.php,
// the DataTables endpoint the classic Dolibarr order list
// (commande/list.php) actually uses — same "dead REST route, real legacy
// page" pattern already found for Warehouses/Inventory/Customers this
// session. See orderListParser.ts for the per-column verification notes.
//
// length=-1 returns every matching row unpaginated (confirmed live: 72 of 72
// in one call) — same convention as the Warehouse Stock Movements/Customers
// list fixes, and OrdersList.tsx already does its own client-side
// search/pagination over the full array, so this keeps that working
// unchanged. Summary stats (total/this month/total amount/validated/draft)
// have no equivalent endpoint any more, so they're computed client-side from
// this same row list, matching this codebase's established convention.
export function useSalesOrdersSummary() {
  return useQuery({
    queryKey: ['salesOrders', 'summary'],
    queryFn: async (): Promise<SalesOrdersSummary> => {
      const form = new URLSearchParams()
      form.set('draw', '1')
      form.set('start', '0')
      form.set('length', '-1')
      form.set('search[value]', '')
      const columns = ['cust_name', 'currency', 'labelcountry', 'typent_code', 'contact', 'cust_type', 'entity', 'date', 'tot_amount', 'author', 'shippable', 'billed', 'status']
      columns.forEach((c, i) => form.set(`columns[${i}][data]`, c))
      form.set('order[0][column]', '0')
      form.set('order[0][dir]', 'desc')

      const { data } = await axios.post<{ iTotalRecords: number; iTotalDisplayRecords: number; aaData: RawOrderListRow[] }>(
        '/commande/salesoredr_ajax_list.php?socid=0',
        form,
      )
      const orders = (data.aaData ?? []).map(toRow)

      const now = new Date()
      const ordersThisMonth = orders.filter((o) => {
        const m = o.orderDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (!m) return false
        return Number(m[1]) - 1 === now.getMonth() && Number(m[3]) === now.getFullYear()
      }).length

      return {
        totalOrders: data.iTotalDisplayRecords ?? orders.length,
        ordersThisMonth,
        totalOrderAmount: orders.reduce((sum, o) => sum + o.amountExclTax, 0),
        validatedCount: orders.filter((o) => o.status === 'Validated').length,
        draftCount: orders.filter((o) => o.status === 'Draft').length,
        orders,
      }
    },
    staleTime: 1000 * 30,
  })
}
