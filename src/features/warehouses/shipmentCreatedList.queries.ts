import { useQuery } from '@tanstack/react-query'
import { useShipments, type ShipmentRow } from './warehouseExtras.queries'
import { useSalesOrdersSummary } from '../salesOrders/salesOrders.queries'

// Real reference page: expedition/shippingcard.php?action=create2's
// "Shipment Created List" tab. Its own SQL (read directly from source) joins
// llx_expedition -> llx_element_element -> llx_commande (+ a llx_societe
// lookup for the name) to get Order Ref/Customer/Price, and separately joins
// llx_delivery + a custom llx_packing table per row to compute the "Order
// Status" badge (Shipment Created / Delivery Created / Packing Created).
// None of this has a JSON endpoint — this page was the ONLY place found that
// computes that status (confirmed: expedition/card.php, the shipment's own
// detail page, has no llx_packing reference at all), so per an explicit
// product decision, the status badge is dropped rather than scraped from the
// exact page being redesigned. Order Ref/Customer/Price ARE reproduced with
// real data: expedition/card.php's own "Ref. order" row gives the real
// origin order id/ref per shipment (confirmed live against all 4 real
// shipments on this install), which is then cross-referenced against the
// already-real Sales Orders list (useSalesOrdersSummary) for the customer
// name and order total — both genuinely real, no guessing. Delivery date
// comes from that same shipment card's real "Planned date of delivery" row.
export interface ShipmentCreatedRow extends ShipmentRow {
  orderId: number | null
  orderRef: string
  customerName: string
  socid: number | null
  amountExclTax: number | null
  deliveryDate: string
}

interface ShipmentCardExtra {
  orderId: number | null
  orderRef: string
  deliveryDate: string
}

function parseShipmentCardExtra(html: string): ShipmentCardExtra {
  const orderMatch = html.match(/Ref\. order<\/td><td colspan="3"><a href="\/commande\/card\.php\?id=(\d+)"[^>]*>[\s\S]*?<\/span>([^<]*)<\/a>/)
  const deliveryMatch = html.match(/Planned date of delivery<\/td><td class="custumRight editFieldRightAlign[^>]*>([^<]*)</)
  return {
    orderId: orderMatch ? Number(orderMatch[1]) : null,
    orderRef: orderMatch ? orderMatch[2].trim() : '',
    deliveryDate: deliveryMatch ? deliveryMatch[1].trim() : '',
  }
}

async function fetchShipmentCardExtra(id: string): Promise<ShipmentCardExtra> {
  const res = await fetch(`/expedition/card.php?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return parseShipmentCardExtra(await res.text())
}

export function useShipmentCreatedList() {
  const shipments = useShipments()
  const orders = useSalesOrdersSummary()
  const shipmentKey = (shipments.data ?? []).map((s) => s.id).join(',')

  const extras = useQuery({
    queryKey: ['warehouses', 'shipmentCreatedExtras', shipmentKey],
    queryFn: async () => {
      const rows = shipments.data ?? []
      const results = await Promise.all(rows.map(async (s) => ({ id: s.id, extra: await fetchShipmentCardExtra(s.id) })))
      return new Map(results.map((r) => [r.id, r.extra]))
    },
    enabled: !shipments.isLoading && (shipments.data?.length ?? 0) > 0,
    staleTime: 1000 * 30,
  })

  const rows: ShipmentCreatedRow[] = (shipments.data ?? []).map((s) => {
    const extra = extras.data?.get(s.id)
    const order = extra?.orderId ? orders.data?.orders.find((o) => o.id === extra.orderId) : undefined
    return {
      ...s,
      orderId: extra?.orderId ?? null,
      orderRef: extra?.orderRef ?? '',
      customerName: order?.thirdParty ?? '',
      socid: order?.socid ?? null,
      amountExclTax: order ? order.amountExclTax : null,
      deliveryDate: extra?.deliveryDate ?? '',
    }
  })

  return {
    rows,
    isLoading: shipments.isLoading || orders.isLoading || (extras.isFetching && !extras.data),
    isError: shipments.isError || orders.isError || extras.isError,
    error: shipments.error ?? orders.error ?? extras.error,
  }
}
