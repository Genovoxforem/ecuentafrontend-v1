// expedition/list.php — the real per-shipment table (Ref/Ref Customer/
// Third-Party/Town/Zip/Planned Delivery Date/Tracking Number/Delivery Ref/
// Date Received/Status), confirmed by reading the page's own $arrayfields
// and print loop directly (htdocs/expedition/list.php), not guessed.
//
// This app's earlier ShipmentSearchPage/ShipmentStatusList carried a
// comment claiming "no shipment endpoint exists on this backend" — that
// was only true of the bespoke /api/* namespace (api/customer, api/user,
// ...); it missed this real, session-cookie-authenticated legacy list
// page entirely. A real REST class also exists
// (expedition/class/api_shipments.class.php, endpoint /expeditions), but
// it requires a DOLAPIKEY matched against llx_user.api_key — a value this
// app's own login flow never obtains (it issues its own deterministic key
// for a separate, bespoke auth middleware instead) — so this page-scrape
// is the real usable path today, same "no REST API, real page is live"
// pattern already used for Warehouses/Inventories/stock movements.
//
// Column visibility on this list depends on server config (DeliveryRef/
// DateReceived only render when the "Delivery receipt" module is on), so
// rather than trust fixed cell indices this locates each column by its
// header's real sortfield (e.g. "sortfield=e.ref") — the same anchor
// Dolibarr's own print_liste_field_titre() embeds in every sortable
// column header on every list page in this app — robust regardless of
// which optional columns happen to be enabled on this installation.

export interface ShipmentListRow {
  id: number
  ref: string
  refCustomer: string
  thirdPartyName: string
  town: string
  zip: string
  plannedDeliveryDate: string
  trackingNumber: string
  deliveryRef: string
  dateDeliveryReceived: string
  statusLabel: string
}

type ShipmentListField = Exclude<keyof ShipmentListRow, 'id' | 'ref'>

const COLUMN_SORTFIELDS: Record<ShipmentListField, string> = {
  refCustomer: 'e.ref_customer',
  thirdPartyName: 's.nom',
  town: 's.town',
  zip: 's.zip',
  plannedDeliveryDate: 'e.date_delivery',
  trackingNumber: 'e.tracking_number',
  deliveryRef: 'l.ref',
  dateDeliveryReceived: 'l.date_delivery',
  statusLabel: 'e.fk_statut',
}

function buildColumnIndexMap(doc: Document): Partial<Record<ShipmentListField, number>> {
  const headerCells = Array.from(doc.querySelectorAll('table.liste th, table.tagtable th'))
  const map: Partial<Record<ShipmentListField, number>> = {}
  headerCells.forEach((th, index) => {
    const href = th.querySelector('a[href*="sortfield="]')?.getAttribute('href') ?? ''
    for (const [field, sortfield] of Object.entries(COLUMN_SORTFIELDS) as Array<[ShipmentListField, string]>) {
      if (href.includes(`sortfield=${sortfield}`)) map[field] = index
    }
  })
  return map
}

export function parseShipmentListDocument(doc: Document): ShipmentListRow[] {
  const columnMap = buildColumnIndexMap(doc)
  const links = Array.from(doc.querySelectorAll('a[href*="expedition/card.php?id="]'))
  const result: ShipmentListRow[] = []
  const seen = new Set<number>()
  for (const link of links) {
    const row = link.closest('tr')
    const idMatch = link.getAttribute('href')?.match(/[?&]id=(\d+)/)
    if (!row || !idMatch) continue
    const id = Number(idMatch[1])
    if (seen.has(id)) continue
    seen.add(id)
    const cells = row.querySelectorAll('td')
    const cellText = (field: ShipmentListField): string => {
      const idx = columnMap[field]
      if (idx === undefined || !cells[idx]) return ''
      return (cells[idx].textContent ?? '').replace(/\s+/g, ' ').trim()
    }
    result.push({
      id,
      ref: (link.textContent ?? '').trim(),
      refCustomer: cellText('refCustomer'),
      thirdPartyName: cellText('thirdPartyName'),
      town: cellText('town'),
      zip: cellText('zip'),
      plannedDeliveryDate: cellText('plannedDeliveryDate'),
      trackingNumber: cellText('trackingNumber'),
      deliveryRef: cellText('deliveryRef'),
      dateDeliveryReceived: cellText('dateDeliveryReceived'),
      statusLabel: cellText('statusLabel'),
    })
  }
  return result
}

// Dolibarr's login page always has both a username and a password field —
// distinctive enough on its own that checking for a real in-app marker
// (like warehouseHtmlParser's own version does with '.info-box.card-body')
// isn't needed here.
export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !!doc.querySelector('input[name="password"]') && !!doc.querySelector('input[name="username"]')
}
