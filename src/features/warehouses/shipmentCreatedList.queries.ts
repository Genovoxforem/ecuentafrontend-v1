import { useQuery } from '@tanstack/react-query'
import type { ShipmentRow } from './warehouseExtras.queries'
import { fetchShipmentsFapi } from './shipmentListEnriched.queries'
import { useSalesOrdersSummary } from '../salesOrders/salesOrders.queries'

// The "Shipment Created List" tab of the classic shipment search: every shipment with the order it came from, the
// customer, the order total and the planned delivery date. expedition/fapi/list.php gives the shipment and its
// origin order (origins[]); the customer name and the order total are cross-referenced from the sales order list.
// The classic page's Shipment / Delivery / Packing "order status" badge has no API field and stays dropped.
export interface ShipmentCreatedRow extends ShipmentRow {
  orderId: number | null
  orderRef: string
  customerName: string
  socid: number | null
  amountExclTax: number | null
  deliveryDate: string
}

export function useShipmentCreatedList() {
  const shipments = useQuery({ queryKey: ['warehouses', 'shipmentList'], queryFn: () => fetchShipmentsFapi(), staleTime: 1000 * 30 })
  const orders = useSalesOrdersSummary()

  const rows: ShipmentCreatedRow[] = (shipments.data ?? []).map((s) => {
    const order = s.originOrderId ? orders.data?.orders.find((o) => o.id === s.originOrderId) : undefined
    return {
      id: s.id,
      ref: s.ref,
      customerRef: s.customerRef,
      statusCode: s.statusCode,
      dateCreation: s.dateCreation,
      orderId: s.originOrderId,
      orderRef: s.originOrderRef || order?.ref || '',
      customerName: order?.thirdParty ?? s.thirdPartyName,
      socid: order?.socid ?? s.socid,
      amountExclTax: order ? order.amountExclTax : null,
      deliveryDate: s.plannedDeliveryDate,
    }
  })

  return {
    rows,
    isLoading: shipments.isLoading || orders.isLoading,
    isError: shipments.isError || orders.isError,
    error: shipments.error ?? orders.error,
  }
}
