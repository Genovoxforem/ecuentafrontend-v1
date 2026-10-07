import { useQuery } from '@tanstack/react-query'
import { fapi } from '../../api/axios'

export interface OrderRow {
  id: number
  ref: string
  refCustomer: string
  projectRef: string
  thirdParty: string
  socid: number | null
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

interface FapiOrderRow {
  id: number
  ref: string
  ref_client: string
  fk_soc: number
  third_party_name: string
  third_party_town: string
  third_party_zip: string
  date_commande: string | null
  date_delivery: string | null
  total_ht: number
  status_label: string
  billed: number | null
  author_login: string
  author_firstname: string
  author_lastname: string
  project_ref: string | null
}

// ISO "YYYY-MM-DD[ hh:mm:ss]" → the "MM/DD/YYYY" display format the legacy
// DataTables column carried (the ordersThisMonth filter below keys on it).
function toDisplayDate(iso: string | null): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso
}

// commande/fapi/list.php — the pure-JSON order list (entity-isolated,
// commande.lire + sales-rep restrictions applied server-side). Replaces the
// DataTables endpoint salesoredr_ajax_list.php, whose JSON cells were HTML
// fragments needing client-side parsing.
export function useSalesOrdersSummary() {
  return useQuery({
    queryKey: ['salesOrders', 'summary'],
    queryFn: async (): Promise<SalesOrdersSummary> => {
      // The UI does its own client-side search/pagination over the full
      // array — pull up to the endpoint's max page size, then follow pages.
      const first = await fapi.get<{ success: boolean; data: { items: FapiOrderRow[]; pagination: { total: number; pages: number } } }>(
        '/commande/fapi/list.php?limit=500&sort=date_commande&direction=desc',
      )
      let items = first.data.data.items ?? []
      const { total, pages } = first.data.data.pagination
      for (let p = 2; p <= pages; p++) {
        const next = await fapi.get<{ success: boolean; data: { items: FapiOrderRow[] } }>(
          `/commande/fapi/list.php?limit=500&page=${p}&sort=date_commande&direction=desc`,
        )
        items = items.concat(next.data.data.items ?? [])
      }

      const orders: OrderRow[] = items.map((o) => ({
        id: o.id,
        ref: o.ref,
        refCustomer: o.ref_client ?? '',
        projectRef: o.project_ref ?? '',
        thirdParty: o.third_party_name ?? '',
        socid: o.fk_soc || null,
        city: o.third_party_town ?? '',
        zipCode: o.third_party_zip ?? '',
        orderDate: toDisplayDate(o.date_commande),
        plannedDelivery: toDisplayDate(o.date_delivery),
        amountExclTax: Number(o.total_ht) || 0,
        author: (o.author_firstname || o.author_lastname) ? `${o.author_firstname} ${o.author_lastname}`.trim() : o.author_login,
        // The legacy shippable calculation is gated on an undefined variable
        // on this deployment and never runs — fixed false, not fabricated.
        shippable: false,
        billed: o.billed === 1,
        status: o.status_label,
      }))

      const now = new Date()
      const ordersThisMonth = orders.filter((o) => {
        const m = o.orderDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (!m) return false
        return Number(m[1]) - 1 === now.getMonth() && Number(m[3]) === now.getFullYear()
      }).length

      return {
        totalOrders: total,
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
