// Parses the 3 real legacy sub-pages behind Sales Order Detail's
// Contacts/Addresses, Shipments-Delivery Receipts, and Stock Consumptions
// tabs (commande/contact.php, expedition/shipment.php,
// custom/consumption/card.php) — each a genuinely separate page from
// commande/card.php, with its own layout. Verified against real fetched
// pages (order id=81, id=112), not guessed.

export interface ContactRow {
  nature: string
  thirdParty: string
  contact: string
  contactType: string
  status: string
}

// Assigned-contacts table: `<table class="mt-3 table table-bordered ...">`
// — distinguished from the "add a contact" forms table right above it
// (same base classes, no `mt-3`) by that one extra class. Confirmed live on
// two real orders (id=81, id=112) that this table currently has zero body
// rows anywhere in this dataset (no order has an assigned contact yet) —
// row extraction below is intentionally generic (plain cell textContent,
// no sub-selectors) since there's no real non-empty row to verify an exact
// inner structure against.
export function parseOrderContactsHtml(html: string): ContactRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = Array.from(doc.querySelectorAll('table')).find((t) => t.classList.contains('mt-3') && t.classList.contains('table-bordered'))
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr')).filter((r) => !r.querySelector('th'))
  return rows.map((r) => {
    const cells = r.querySelectorAll('td')
    return {
      nature: (cells[0]?.textContent ?? '').trim(),
      thirdParty: (cells[1]?.textContent ?? '').trim(),
      contact: (cells[2]?.textContent ?? '').trim(),
      contactType: (cells[3]?.textContent ?? '').trim(),
      status: (cells[4]?.textContent ?? '').trim(),
    }
  })
}

export interface ContactOption {
  value: string
  label: string
}

export interface ContactFormOptions {
  issuerCompanyName: string
  internalUserOptions: ContactOption[]
  internalTypeOptions: ContactOption[]
  companyOptions: ContactOption[]
  selectedCompanyId: string
  externalContactOptions: ContactOption[]
  hasRealExternalContact: boolean
  externalTypeOptions: ContactOption[]
}

function extractSelectOptions(html: string, attr: 'id' | 'name', name: string): string {
  const m = html.match(new RegExp(`<select[^>]*${attr}="${name}"[^>]*>([\\s\\S]*?)<\\/select>`))
  return m?.[1] ?? ''
}

function parseOptions(selectHtml: string): ContactOption[] {
  const re = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g
  const out: ContactOption[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(selectHtml))) out.push({ value: m[1], label: m[2].trim() })
  return out
}

// The two real "add a contact" rows on commande/contact.php (see
// core/tpl/contacts.tpl.php, read directly): a "Users" (internal) row
// posting userid+type, and a "Third-party contacts" (external) row posting
// newcompany/contactid+typecontact. Both submit action=addcontact to this
// same page (confirmed by reading contact.php's own addcontact handler —
// no CSRF token check on this action at all), regardless of whatever
// client-side AJAX enhancement the real page's JS may or may not apply on
// top — the server-side contract is what matters and is verified here.
export function parseContactFormOptions(html: string): ContactFormOptions {
  // The "Users" row's Third-Party cell is the real issuing company name
  // (getDolGlobalString('MAIN_INFO_SOCIETE_NOM')), a plain-text <td>
  // immediately following the "Users" label cell — confirmed live.
  const issuerCompanyName = html.match(/Users<\/td>\s*<td>([^<]*)<\/td>/)?.[1]?.trim() ?? ''
  const internalUserOptions = parseOptions(extractSelectOptions(html, 'id', 'userid'))
  const internalTypeOptions = parseOptions(extractSelectOptions(html, 'id', 'type'))
  const companySelectHtml = extractSelectOptions(html, 'id', 'newcompany')
  const companyOptions = parseOptions(companySelectHtml)
  const selectedCompanyId = companySelectHtml.match(/<option value="([^"]*)" selected/)?.[1] ?? ''
  const externalContactOptions = parseOptions(extractSelectOptions(html, 'id', 'contactid'))
  const externalTypeOptions = parseOptions(extractSelectOptions(html, 'id', 'typecontact'))
  return {
    issuerCompanyName,
    internalUserOptions,
    internalTypeOptions,
    companyOptions,
    selectedCompanyId,
    externalContactOptions,
    hasRealExternalContact: externalContactOptions.some((o) => o.value !== '-1'),
    externalTypeOptions,
  }
}

export interface ShipmentStockRow {
  description: string
  qtyOrdered: number
  qtyShipped: number
  remainToShip: number
  realStock: number
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// "Stock Details" table on expedition/shipment.php: Description/Qty
// ordered/Qty shipped/Remain to ship/Real Stock, one row per order line —
// real fulfillment data not shown anywhere on the main Sales Order tab.
// Real data rows carry `class="oddeven"`; the header row (plain <td>s, no
// <th>) doesn't, so filtering on that class cleanly skips it.
export function parseOrderShipmentStockDetails(html: string): ShipmentStockRow[] {
  const idx = html.indexOf('Stock Details')
  if (idx === -1) return []
  const tableStart = html.indexOf('<table', idx)
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableStart === -1 || tableEnd === -1) return []
  const doc = new DOMParser().parseFromString(html.slice(tableStart, tableEnd + '</table>'.length), 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
  return rows.map((row) => {
    const cells = row.querySelectorAll('td')
    return {
      description: (cells[0]?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      qtyOrdered: parseAmount(cells[1]?.textContent ?? ''),
      qtyShipped: parseAmount(cells[2]?.textContent ?? ''),
      remainToShip: parseAmount(cells[3]?.textContent ?? ''),
      realStock: parseAmount(cells[4]?.textContent ?? ''),
    }
  })
}

export interface WarehouseOption {
  value: string
  label: string
}

export interface CreateShipmentFormOptions {
  warehouseOptions: WarehouseOption[]
  defaultWarehouseId: string
}

// The real "Create shipment" GET form at the bottom of expedition/shipment
// .php (action=expedition/card.php?action=create&origin=commande&
// origin_id=X&entrepot_id=Y) — a real, safe navigation (not itself a
// destructive submit, it opens the actual shipment-creation review page).
// Verified live (order id=79): #entrepot_id carries the real warehouse list
// for this install (MAIN_BRANCH, M1 Warehouse, etc.), not guessed.
export function parseCreateShipmentFormOptions(html: string): CreateShipmentFormOptions {
  const selectHtml = extractSelectOptions(html, 'id', 'entrepot_id')
  const warehouseOptions = parseOptions(selectHtml).filter((o) => o.value !== '-1')
  const defaultWarehouseId = selectHtml.match(/<option value="([^"]*)" selected/)?.[1] ?? warehouseOptions[0]?.value ?? ''
  return { warehouseOptions, defaultWarehouseId }
}

export interface ConsumptionFormOptions {
  token: string
  warehouseOptions: WarehouseOption[]
  productOptions: WarehouseOption[]
  defaultLabel: string
}

// The real "Declare" form at custom/consumption/card.php (action=conso,
// read directly from that page's own handler in card.php — POSTs
// product/id_entrepot/nbpiece/batch_number/label/eatby/sellby to a real
// stock-movement-creation method, Consumption::correct_stock()). No
// separate REST endpoint exists for this; verified real field names by
// reading the PHP handler directly, not guessed from the rendered form.
export function parseConsumptionFormOptions(html: string): ConsumptionFormOptions {
  const token = html.match(/name="token" value="([^"]*)"/)?.[1] ?? ''
  const warehouseOptions = parseOptions(extractSelectOptions(html, 'id', 'id_entrepot')).filter((o) => o.value !== '-1')
  const productOptions = parseOptions(extractSelectOptions(html, 'id', 'product')).filter((o) => o.value !== '0')
  const defaultLabel = html.match(/name="label" size="65" class="form-control" value="([^"]*)"/)?.[1] ?? ''
  return { token, warehouseOptions, productOptions, defaultLabel }
}

export interface ConsumptionRow {
  ref: string
  date: string
  productRef: string
  lotSerial: string
  warehouse: string
  invMovCode: string
  labelOfMovement: string
  origin: string
  qty: string
}

// "List of Consumption (For this Order)" — a real, server-rendered
// Dolibarr list table (not a DataTables AJAX endpoint, confirmed live: only
// one network request fires when loading this page). Real data rows carry
// `class="oddeven"`, the same convention already confirmed on every other
// genuine Dolibarr list table scraped elsewhere in this app (Shipments'
// Stock Details, Warehouse stats, etc.) — no non-empty sample of this
// specific table exists on this backend yet to verify exact inner
// structure against (see the CONSUMPTION_SEARCHMODE note in
// project_sales_order_stock_reserve_migration-adjacent findings: this
// list's own filter only matches movements whose label contains the
// order's ref, so it stays genuinely empty until a consumption is
// declared through this same form), so cells are read by position only.
export function parseConsumptionList(html: string): ConsumptionRow[] {
  const idx = html.search(/List\s+of\s+Consumption/i)
  if (idx === -1) return []
  const tableStart = html.indexOf('liste_titre_filter', idx)
  if (tableStart === -1) return []
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableEnd === -1) return []
  const doc = new DOMParser().parseFromString(`<table>${html.slice(tableStart, tableEnd)}</table>`, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
  return rows.map((row) => {
    const cells = row.querySelectorAll('td')
    return {
      ref: (cells[0]?.textContent ?? '').trim(),
      date: (cells[1]?.textContent ?? '').trim(),
      productRef: (cells[2]?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      lotSerial: (cells[3]?.textContent ?? '').trim(),
      warehouse: (cells[4]?.textContent ?? '').trim(),
      invMovCode: (cells[5]?.textContent ?? '').trim(),
      labelOfMovement: (cells[6]?.textContent ?? '').trim(),
      origin: (cells[7]?.textContent ?? '').trim(),
      qty: (cells[8]?.textContent ?? '').trim(),
    }
  })
}
