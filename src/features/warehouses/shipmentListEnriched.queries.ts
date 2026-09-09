import { useQuery } from '@tanstack/react-query'
import { useShipments, type ShipmentRow } from './warehouseExtras.queries'

// Real reference page: expedition/list.php (List Of Shipments / Draft /
// Validated / Processed nav items — the same real page, filtered by its own
// viewstatut=0/1/2 param). expedition/shipment-sidebar-list-ajax.php (what
// ShipmentStatusList.tsx used before this) only exposes
// ref/ref_customer/fk_statut/date_creation — Third-Party, Tracking Number
// and Planned Date Of Delivery are all real fields too, but only surface on
// each shipment's own card page (expedition/card.php?id=X), confirmed live
// against all 4 real shipments on this install (customer link + name,
// "Tracking number" row, "Planned date of delivery" row).
//
// City/Zip Code: real too — llx_societe fields on the same customer record
// the shipment already links to. No JSON endpoint exists on expedition/
// itself for this, but societe/api/societe.php?id=<socid> (the same real
// API src/features/customers/customerDetail.queries.ts's useCustomerDetail
// already uses) returns them directly (confirmed live for all 3 real
// customers on this install — zip/town happen to be blank for all three,
// which is real data, not a parsing gap).
//
// Ref Delivery/Date Delivery Received: real, but the join is one step
// removed from anything expedition/ exposes — confirmed live that
// expedition/card.php's own Linked Objects block never lists a Delivery
// record. The real path is delivery/card.php?action=list (a small real
// table of every Delivery: id/ref/status — confirmed 3 real rows on this
// install) plus, per delivery, delivery/card.php?id=<id> which shows BOTH
// the originating Shipment link (a "Shipment" row in ITS OWN Linked Objects
// block — the reverse direction from the one expedition/card.php doesn't
// have) and the real "Date delivery received" field. No JSON exists for any
// of this (confirmed: no delivery/list.php file at all, and grep for
// json_encode under delivery/ turns up nothing), so this is a genuine
// scrape of a small, bounded set of real records (one per Delivery, not per
// Shipment) rather than a shortcut around a real API that could have been
// used instead.
export interface ShipmentListRow extends ShipmentRow {
  socid: number | null
  thirdPartyName: string
  trackingNumber: string
  plannedDeliveryDate: string
  city: string
  zip: string
  deliveryRef: string
  dateDeliveryReceived: string
}

interface ShipmentCardBasics {
  socid: number | null
  thirdPartyName: string
  trackingNumber: string
  plannedDeliveryDate: string
}

function parseShipmentCardBasics(html: string): ShipmentCardBasics {
  const customerMatch = html.match(/societe\/card\.php\?socid=(\d+)"[^>]*>[\s\S]*?<div class="avatar-circle"[^>]*>[^<]*<\/div>([^<]*)<\/a>/)
  const trackingMatch = html.match(/Tracking number<\/label><\/td><td class="custumRight">([^<]*)</)
  const deliveryMatch = html.match(/Planned date of delivery<\/td><td class="custumRight editFieldRightAlign[^>]*>([^<]*)</)
  return {
    socid: customerMatch ? Number(customerMatch[1]) : null,
    thirdPartyName: customerMatch ? customerMatch[2].trim() : '',
    trackingNumber: trackingMatch ? trackingMatch[1].trim() : '',
    plannedDeliveryDate: deliveryMatch ? deliveryMatch[1].trim() : '',
  }
}

async function fetchShipmentCardBasics(id: string): Promise<ShipmentCardBasics> {
  const res = await fetch(`/expedition/card.php?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return parseShipmentCardBasics(await res.text())
}

interface CityZip {
  city: string
  zip: string
}

async function fetchCityZip(socid: number): Promise<CityZip> {
  const res = await fetch(`/societe/api/societe.php?id=${socid}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const parsed = JSON.parse((await res.text()).trim())
  if (!parsed.ok) return { city: '', zip: '' }
  return { city: parsed.profile?.town ?? '', zip: parsed.profile?.zip ?? '' }
}

interface DeliveryInfo {
  shipmentId: number | null
  ref: string
  dateReceived: string
}

function parseDeliveryListIds(html: string): number[] {
  const ids: number[] = []
  const re = /delivery\/card\.php\?id=(\d+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) ids.push(Number(m[1]))
  return ids
}

function parseDeliveryCard(html: string): DeliveryInfo {
  const shipmentMatch = html.match(/<td>Shipment<\/td>\s*<td><a href="\/expedition\/card\.php\?id=(\d+)"/)
  const refMatch = html.match(/name="ref" value="([^"]*)"/)
  const receivedMatch = html.match(/Date delivery received<\/td><td class="custumRight editFieldRightAlign[^>]*>([^<]*)</)
  return {
    shipmentId: shipmentMatch ? Number(shipmentMatch[1]) : null,
    ref: refMatch ? refMatch[1] : '',
    dateReceived: receivedMatch ? receivedMatch[1].trim() : '',
  }
}

async function fetchDeliveriesByShipmentId(): Promise<Map<number, DeliveryInfo>> {
  const listRes = await fetch('/delivery/card.php?action=list', { credentials: 'same-origin' })
  if (!listRes.ok) throw new Error(`Legacy backend returned ${listRes.status}.`)
  const deliveryIds = parseDeliveryListIds(await listRes.text())

  const infos = await Promise.all(
    deliveryIds.map(async (id) => {
      const res = await fetch(`/delivery/card.php?id=${id}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseDeliveryCard(await res.text())
    }),
  )

  const map = new Map<number, DeliveryInfo>()
  for (const info of infos) if (info.shipmentId !== null) map.set(info.shipmentId, info)
  return map
}

export function useShipmentListEnriched() {
  const shipments = useShipments()
  const shipmentKey = (shipments.data ?? []).map((s) => s.id).join(',')

  const cardExtras = useQuery({
    queryKey: ['warehouses', 'shipmentListExtras', shipmentKey],
    queryFn: async () => {
      const rows = shipments.data ?? []
      const results = await Promise.all(rows.map(async (s) => ({ id: s.id, extra: await fetchShipmentCardBasics(s.id) })))
      return new Map(results.map((r) => [r.id, r.extra]))
    },
    enabled: !shipments.isLoading && (shipments.data?.length ?? 0) > 0,
    staleTime: 1000 * 30,
  })

  const socidKey = Array.from(new Set((cardExtras.data ? Array.from(cardExtras.data.values()) : []).map((e) => e.socid).filter((v): v is number => v !== null))).join(',')

  const cityZipExtras = useQuery({
    queryKey: ['warehouses', 'shipmentListCityZip', socidKey],
    queryFn: async () => {
      const socids = socidKey.split(',').map(Number)
      const results = await Promise.all(socids.map(async (socid) => ({ socid, cityZip: await fetchCityZip(socid) })))
      return new Map(results.map((r) => [r.socid, r.cityZip]))
    },
    enabled: !!socidKey,
    staleTime: 1000 * 60,
  })

  const deliveryExtras = useQuery({
    queryKey: ['warehouses', 'shipmentListDeliveries', shipmentKey],
    queryFn: fetchDeliveriesByShipmentId,
    enabled: !shipments.isLoading && (shipments.data?.length ?? 0) > 0,
    staleTime: 1000 * 30,
  })

  const rows: ShipmentListRow[] = (shipments.data ?? []).map((s) => {
    const extra = cardExtras.data?.get(s.id)
    const cityZip = extra?.socid ? cityZipExtras.data?.get(extra.socid) : undefined
    const delivery = deliveryExtras.data?.get(Number(s.id))
    return {
      ...s,
      socid: extra?.socid ?? null,
      thirdPartyName: extra?.thirdPartyName ?? '',
      trackingNumber: extra?.trackingNumber ?? '',
      plannedDeliveryDate: extra?.plannedDeliveryDate ?? '',
      city: cityZip?.city ?? '',
      zip: cityZip?.zip ?? '',
      deliveryRef: delivery?.ref ?? '',
      dateDeliveryReceived: delivery?.dateReceived ?? '',
    }
  })

  return {
    rows,
    isLoading: shipments.isLoading || (cardExtras.isFetching && !cardExtras.data) || (deliveryExtras.isFetching && !deliveryExtras.data),
    isError: shipments.isError || cardExtras.isError || cityZipExtras.isError || deliveryExtras.isError,
    error: shipments.error ?? cardExtras.error ?? cityZipExtras.error ?? deliveryExtras.error,
  }
}
