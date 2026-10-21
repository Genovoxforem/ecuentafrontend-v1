/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages, pickNum, pickNumOrNull, pickStr, usDate } from '../../api/fapiRow'
import type { ShipmentRow } from './warehouseExtras.queries'

// expedition/fapi/list.php (16 Oct 2026): every shipment with its third party (name, town, zip), tracking
// number, planned delivery date, status and origin documents in ONE call, where the classic list needed a page
// fetch per shipment plus a societe lookup and a delivery-card scrape. Status codes are the real ones
// (0 draft, 1 validated, 2 processed). The delivery receipt ref and "date delivery received" are not part of
// the shipment list contract, so those two columns stay empty (listed as a backend request).
export interface ShipmentListRow extends ShipmentRow {
  socid: number | null
  thirdPartyName: string
  trackingNumber: string
  plannedDeliveryDate: string
  city: string
  zip: string
  deliveryRef: string
  dateDeliveryReceived: string
  originOrderId: number | null
  originOrderRef: string
  weightKg: number
}

export function shipmentRowFromApi(s: any): ShipmentListRow {
  const origin = ((s.origins ?? []) as any[]).find((o) => /commande|order/i.test(String(o.type ?? o.element ?? 'order'))) ?? (s.origins ?? [])[0]
  return {
    id: String(s.id),
    ref: pickStr(s, 'ref'),
    customerRef: pickStr(s, 'ref_customer', 'ref_client') || null,
    statusCode: pickNum(s, 'status', 'fk_statut'),
    dateCreation: usDate(s.date_creation ?? s.date_created),
    socid: pickNumOrNull(s, 'customer.id', 'thirdparty.id', 'socid', 'fk_soc'),
    thirdPartyName: pickStr(s, 'customer.name', 'thirdparty.name', 'company', 'third_party_name'),
    trackingNumber: pickStr(s, 'tracking_number', 'tracking'),
    plannedDeliveryDate: usDate(s.date_delivery ?? s.planned_delivery ?? s.date_delivery_planned),
    city: pickStr(s, 'customer.town', 'thirdparty.town', 'town'),
    zip: pickStr(s, 'customer.zip', 'thirdparty.zip', 'zip'),
    deliveryRef: pickStr(s, 'delivery.ref', 'delivery_ref'),
    dateDeliveryReceived: usDate(s.delivery?.date_received ?? s.date_delivery_received),
    originOrderId: origin ? pickNumOrNull(origin, 'id', 'fk_source') : null,
    originOrderRef: origin ? pickStr(origin, 'ref') : '',
    weightKg: pickNum(s, 'weight_kg'),
  }
}

export async function fetchShipmentsFapi(params: Record<string, unknown> = {}): Promise<ShipmentListRow[]> {
  const items = await fetchAllPages((page) => fapiGet<any>('/expedition/fapi/list.php', { page, limit: 100, ...params }))
  return items.map(shipmentRowFromApi)
}

export function useShipmentListEnriched() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['warehouses', 'shipmentList'], queryFn: () => fetchShipmentsFapi(), staleTime: 1000 * 30 })
  return { rows: data ?? [], isLoading, isError, error }
}
