// Parses the legacy warehouse stats page (product/stock/index.php) client-side
// for the counts that have no REST API — Inventories, Shipments, Receptions,
// Stock Reservations, and today's real Movements count (see
// warehouses.queries.ts for why: totalProductsInStock/totalStockQuantity/
// totalStockValue/productsOutOfStock/productsLowStock are already computed
// honestly from the real /api/products/ endpoint and don't need this).
//
// Every stat tile on that page shares one consistent custom "info-box"
// widget markup (label div, value div, optional caption div, all inside a
// `display:flex; justify-content:space-between` row) — verified against
// real fetched HTML from the live local backend, not guessed from
// screenshots. The Quick Actions / Stock Transfer & Reports button-group
// cards use a different (single-column) layout and are naturally excluded
// by the `space-between` selector.

export interface WarehouseStatTile {
  label: string
  value: string
  caption: string | null
}

function parseCount(text: string | undefined): number {
  if (!text) return 0
  const n = Number(text.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

// "4 Validated" -> 4
function parseCaptionCount(caption: string | null | undefined): number {
  const m = caption ? /(\d+)/.exec(caption) : null
  return m ? Number(m[1]) : 0
}

export function parseWarehouseStatTiles(doc: Document): Map<string, WarehouseStatTile> {
  const tiles = new Map<string, WarehouseStatTile>()
  const rows = doc.querySelectorAll('.card > .info-box.card-body > div[style*="space-between"]')
  rows.forEach((row) => {
    const textCol = row.children[0]
    if (!textCol) return
    const divs = Array.from(textCol.children).filter((el): el is HTMLDivElement => el.tagName === 'DIV')
    const label = divs[0]?.textContent?.trim()
    const value = divs[1]?.textContent?.trim()
    if (!label || value === undefined) return
    const caption = divs[2] ? (divs[2].textContent?.trim() ?? null) : null
    tiles.set(label, { label, value, caption })
  })
  return tiles
}

export interface WarehouseLegacyStats {
  warehousesActive: number
  warehousesTotal: number
  inventories: number
  shipments: { total: number; validated: number }
  receptions: { total: number; validated: number }
  reservations: { active: number; totalReservedQty: number; released: number; consumed: number }
  movementsToday: number
}

// "5 / 5" -> [5, 5]
function parseFraction(value: string | undefined): [number, number] {
  const m = value ? /(\d+)\s*\/\s*(\d+)/.exec(value) : null
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

export function parseWarehouseLegacyStats(doc: Document): WarehouseLegacyStats {
  const tiles = parseWarehouseStatTiles(doc)
  const get = (label: string) => tiles.get(label)
  const [warehousesActive, warehousesTotal] = parseFraction(get('Warehouses')?.value)

  return {
    warehousesActive,
    warehousesTotal,
    inventories: parseCount(get('Inventories')?.value),
    shipments: {
      total: parseCount(get('Shipments')?.value),
      validated: parseCaptionCount(get('Shipments')?.caption),
    },
    receptions: {
      total: parseCount(get('Receptions')?.value),
      validated: parseCaptionCount(get('Receptions')?.caption),
    },
    reservations: {
      active: parseCount(get('Active Reservations')?.value),
      totalReservedQty: parseCount(get('Total Reserved Qty')?.value),
      released: parseCount(get('Released')?.value),
      consumed: parseCount(get('Consumed')?.value),
    },
    movementsToday: parseCount(get('Movements Today')?.value),
  }
}

// Same best-effort-cookie caveat as ledgerHtmlParser.ts's equivalent — the
// DOLSESSID cookie is set once at login (legacySession.ts) and never
// throws if it's missing, so a stale/absent session silently redirects to
// Dolibarr's own login page instead of the real stats page.
export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('.info-box.card-body') && !!doc.querySelector('input[name="password"]')
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// product/stock/list.php — the real per-warehouse table (Ref./Short name
// location/Environment/Input stock value/Value for sell/Status), confirmed
// against a real fetched page (5 real warehouses: M1 Warehouse, m3,
// MAIN_BRANCH, mtm, New Warehouse). Rows are located by their real
// stock/card.php?id=X link (the table's own id/class wasn't distinctive
// enough to rely on alone, given how many embedded modal templates this
// app's pages tend to carry — see orderCardParser.ts for the exact failure
// mode a plain table/label selector runs into on pages like this).
export interface WarehouseListRow {
  id: number
  ref: string
  shortName: string
  environment: string
  inputStockValue: number
  valueForSell: number
  statusLabel: string
}

export function parseWarehouseListDocument(doc: Document): WarehouseListRow[] {
  const links = Array.from(doc.querySelectorAll('a[href*="stock/card.php?id="]'))
  const result: WarehouseListRow[] = []
  for (const link of links) {
    const row = link.closest('tr')
    const idMatch = link.getAttribute('href')?.match(/[?&]id=(\d+)/)
    if (!row || !idMatch) continue
    const cells = row.querySelectorAll('td')
    if (cells.length < 6) continue
    result.push({
      id: Number(idMatch[1]),
      ref: (link.textContent ?? '').trim(),
      shortName: (cells[1]?.textContent ?? '').trim(),
      environment: (cells[2]?.textContent ?? '').trim(),
      inputStockValue: parseAmount(cells[3]?.textContent ?? ''),
      valueForSell: parseAmount(cells[4]?.textContent ?? ''),
      statusLabel: (cells[5]?.querySelector('.badge-status')?.textContent ?? '').trim(),
    })
  }
  return result
}

// product/inventory/list.php — the real per-inventory table (Ref./Label/
// Warehouse/Product/Value date/Status), confirmed against a real fetched
// page. Same link-anchored row-location approach as above, for the same
// reason.
export interface InventoryListRow {
  id: number
  ref: string
  label: string
  warehouseId: number | null
  warehouseLabel: string
  productLabel: string
  valueDate: string
  statusLabel: string
}

export function parseInventoryListDocument(doc: Document): InventoryListRow[] {
  const links = Array.from(doc.querySelectorAll('a[href*="inventory/card.php?id="]'))
  const result: InventoryListRow[] = []
  for (const link of links) {
    const row = link.closest('tr')
    const idMatch = link.getAttribute('href')?.match(/[?&]id=(\d+)/)
    if (!row || !idMatch) continue
    const cells = row.querySelectorAll('td')
    if (cells.length < 6) continue
    // The Warehouse cell holds its own real link to stock/card.php?id=X when
    // an inventory has a warehouse set (confirmed live) — empty <td></td>
    // otherwise, same as the Product cell.
    const warehouseLink = cells[2]?.querySelector('a[href*="stock/card.php?id="]')
    const warehouseIdMatch = warehouseLink?.getAttribute('href')?.match(/[?&]id=(\d+)/)
    result.push({
      id: Number(idMatch[1]),
      ref: (link.textContent ?? '').trim(),
      label: (cells[1]?.textContent ?? '').trim(),
      warehouseId: warehouseIdMatch ? Number(warehouseIdMatch[1]) : null,
      warehouseLabel: (cells[2]?.textContent ?? '').trim(),
      productLabel: (cells[3]?.textContent ?? '').trim(),
      valueDate: (cells[4]?.textContent ?? '').trim(),
      statusLabel: (cells[5]?.querySelector('.badge-status')?.textContent ?? '').trim(),
    })
  }
  return result
}

// expensereport/landedcostbilled.php's create form — confirmed live that its
// three "pick a value" fields (Purchase Invoice, Landed Cost Invoice, Landed
// Expense) are all bespoke modal/DataTable pickers, not plain <select>s, and
// that the form itself (110KB+) has no plain <button type="submit"> at all —
// its actual save mechanism is JS-assembled in a way this pass couldn't
// safely reverse-engineer without risking a guessed, unverified write path
// (unlike Warehouses/Inventory earlier, which were fully verified live).
// This only extracts real OPTION data for display/selection, honestly
// leaving Landed Expense unwired rather than guessing its contract:
//   - fk_user_author: a real, already-rendered <select> (just select2-
//     enhanced) — extracted directly via querySelector.
//   - landedcost_id: a real <select multiple> with the full real invoice
//     list, present in the source but wrapped in an HTML comment (the
//     modal-based checkedlanded widget replaces it visually) — invisible to
//     DOMParser, so extracted via regex on the raw HTML text instead.
//   - Purchase Invoice: no such commented fallback exists for this one —
//     its real options come from the "Vendor Invoices" modal's own
//     DataTable rows, which the initial page load already server-renders
//     (page 1 only, ~10 of the real total — confirmed live "Showing 1 to 10
//     of 17 entries" — later pages load via an AJAX call this pass didn't
//     chase, so this is real but not necessarily the complete list).
export interface LandedCostFormOptions {
  users: Array<{ id: number; label: string }>
  vendorInvoices: Array<{ id: number; ref: string; vendorName: string; date: string; amount: number }>
  landedCostInvoices: Array<{ id: number; ref: string }>
}

export function parseLandedCostFormOptions(html: string): LandedCostFormOptions {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const users: LandedCostFormOptions['users'] = []
  doc.querySelectorAll('#fk_user_author option').forEach((opt) => {
    const id = Number(opt.getAttribute('value'))
    const label = (opt.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (id > 0 && label) users.push({ id, label })
  })

  const vendorInvoices: LandedCostFormOptions['vendorInvoices'] = []
  doc.querySelectorAll('#inv_detModal input.prus_id').forEach((checkbox) => {
    const row = checkbox.closest('tr')
    if (!row) return
    const cells = row.querySelectorAll('td')
    const invoiceLink = cells[1]?.querySelector('a[href*="facid="]')
    const idMatch = invoiceLink?.getAttribute('href')?.match(/facid=(\d+)/)
    if (!idMatch) return
    // Vendor name: the tooltip anchor's own direct text nodes only — its
    // avatar-circle child div has its own initials text that would
    // otherwise get prepended (same pitfall as societeListParser.ts's
    // parseCustName / orderCardParser.ts's third-party name extraction).
    const vendorLink = cells[2]?.querySelector('a.refurl')
    const vendorName = vendorLink
      ? Array.from(vendorLink.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent ?? '')
          .join('')
          .trim()
      : (cells[2]?.textContent ?? '').trim()
    vendorInvoices.push({
      id: Number(idMatch[1]),
      ref: (invoiceLink?.textContent ?? '').trim(),
      vendorName,
      date: (cells[3]?.textContent ?? '').trim(),
      amount: parseAmount(cells[4]?.textContent ?? ''),
    })
  })

  const landedCostInvoices: LandedCostFormOptions['landedCostInvoices'] = []
  const commentMatch = html.match(/<!--\s*<select name="landedcost_id"[\s\S]*?<\/select>\s*-->/)
  if (commentMatch) {
    for (const m of commentMatch[0].matchAll(/<option value="(\d+)">([^<]*)<\/option>/g)) {
      landedCostInvoices.push({ id: Number(m[1]), ref: m[2].trim() })
    }
  }

  return { users, vendorInvoices, landedCostInvoices }
}

// product/stock/card.php?id=X — a single real warehouse's own detail page.
// Classic server-rendered Dolibarr page (no REST API under product/stock/,
// confirmed — only ajax/ helpers for other features), so this scrapes it
// directly, same pattern as orderCardParser.ts. Verified against a real
// fetched page (warehouse id=10, "M1 Warehouse").
export interface WarehouseProductRow {
  id: number
  ref: string
  label: string
  units: number
  weightedAvgPrice: number
  inputStockValue: number
  sellingUnitPrice: number
  valueForSell: number
  transferUrl: string
  correctionUrl: string
}

export interface WarehouseCard {
  id: number
  ref: string
  statusLabel: string
  environment: string
  description: string
  differentProductsCount: number
  totalProductsCount: number
  inputStockValue: number
  latestMovement: string
  editUrl: string
  deleteUrl: string
  deleteRefusedTitle: string
  products: WarehouseProductRow[]
}

export function parseWarehouseCardDocument(doc: Document, id: number): WarehouseCard {
  const ref = (doc.querySelector('.ec-movement-product-card-ref')?.textContent ?? '').trim()
  const statusLabel = (doc.querySelector('.subTitle .badge-status')?.textContent ?? '').trim()

  // The two-column info table (Environment/Description/... | Input stock
  // value/Latest movement/...) — located by its own distinctive label text
  // rather than a table index, since this page (like others in this app)
  // embeds more than one similarly-shaped table.
  const infoCells = Array.from(doc.querySelectorAll('.fichehalfleft td, .fichehalfright td'))
  function afterLabel(label: string): Element | undefined {
    const idx = infoCells.findIndex((c) => (c.textContent ?? '').trim() === label)
    return idx >= 0 ? infoCells[idx + 1] : undefined
  }
  const environment = (afterLabel('Environment')?.textContent ?? '').trim()
  const description = (afterLabel('Description')?.textContent ?? '').trim()
  const differentProductsCount = Number((afterLabel('Number of different products')?.textContent ?? '0').trim()) || 0
  const totalProductsCount = Number((afterLabel('Total number of products')?.textContent ?? '0').trim()) || 0
  const inputStockValue = parseAmount(afterLabel('Input stock value')?.textContent ?? '')
  // The cell reads "<date> (Full list)" with "Full list" as a separate
  // <a> — only the date's own leading text node is wanted here, trimmed of
  // the trailing "(" it leaves behind right before that link.
  const latestMovementCell = afterLabel('Latest movement')
  const latestMovement = latestMovementCell
    ? (Array.from(latestMovementCell.childNodes).find((n) => n.nodeType === Node.TEXT_NODE)?.textContent ?? '').replace(/\(\s*$/, '').trim()
    : ''

  const editLink = doc.querySelector('a[href*="action=edit"][href*="card.php"]')
  const deleteLink = doc.querySelector('a.butActionRefused, a[href*="action=delete"][href*="card.php"]')

  const products: WarehouseProductRow[] = []
  doc.querySelectorAll('table#example tbody tr').forEach((row) => {
    if (row.classList.contains('totalRow')) return
    const cells = row.querySelectorAll('td')
    const productLink = cells[0]?.querySelector('a[href*="product.php?id="]')
    const idMatch = productLink?.getAttribute('href')?.match(/[?&]id=(\d+)/)
    if (!idMatch) return
    const transferLink = row.querySelector('a[href*="action=transfert"]')
    const correctionLink = row.querySelector('a[href*="action=correction"]')
    // Ref/label live in the tooltip's own data-geo attribute ("<b>Ref.:</b>
    // xxx<br><b>Label:</b> yyy<br>...") rather than as separate cells.
    const tooltip = productLink?.getAttribute('data-geo') ?? ''
    const refMatch = tooltip.match(/Ref\.:<\/b>\s*([^<]*)</)
    const labelMatch = tooltip.match(/Label:<\/b>\s*([^<]*)</)
    products.push({
      id: Number(idMatch[1]),
      ref: (refMatch?.[1] ?? '').trim(),
      label: (labelMatch?.[1] ?? (productLink?.textContent ?? '')).trim(),
      units: Number((cells[1]?.textContent ?? '0').trim()) || 0,
      weightedAvgPrice: parseAmount(cells[2]?.textContent ?? ''),
      inputStockValue: parseAmount(cells[3]?.textContent ?? ''),
      sellingUnitPrice: parseAmount(cells[4]?.textContent ?? ''),
      valueForSell: parseAmount(cells[5]?.textContent ?? ''),
      transferUrl: transferLink?.getAttribute('href') ?? '',
      correctionUrl: correctionLink?.getAttribute('href') ?? '',
    })
  })

  return {
    id,
    ref,
    statusLabel,
    environment,
    description,
    differentProductsCount,
    totalProductsCount,
    inputStockValue,
    latestMovement,
    editUrl: editLink?.getAttribute('href') ?? '',
    deleteUrl: deleteLink && !deleteLink.classList.contains('butActionRefused') ? (deleteLink.getAttribute('href') ?? '') : '',
    deleteRefusedTitle: deleteLink?.classList.contains('butActionRefused') ? (deleteLink.getAttribute('title') ?? '') : '',
    products,
  }
}

// product/inventory/card.php?id=X — a single real inventory's own detail
// page. Same classic-Dolibarr-page scrape pattern as the warehouse card
// above; verified against a real fetched page (inventory id=2).
export interface RelatedObjectRow {
  type: string
  ref: string
  date: string
  amount: string
  statusLabel: string
}

export interface LinkedEventRow {
  ref: string
  date: string
  by: string
  type: string
  title: string
}

export interface InventoryCard {
  id: number
  label: string
  warehouseId: number | null
  warehouseLabel: string
  productId: number | null
  productLabel: string
  valueDate: string
  statusLabel: string
  emailUrl: string
  modifyUrl: string
  validateUrl: string
  deleteUrl: string
  relatedObjects: RelatedObjectRow[]
  linkedEvents: LinkedEventRow[]
}

function parseGenericTableRows(doc: Document, headerTitles: string[]): Element[] {
  const tables = Array.from(doc.querySelectorAll('table'))
  for (const table of tables) {
    const headerCells = Array.from(table.querySelectorAll('tr.liste_titre th')).map((th) => (th.textContent ?? '').trim())
    if (headerTitles.every((t) => headerCells.includes(t))) {
      return Array.from(table.querySelectorAll('tbody tr, tr')).filter((r) => !r.classList.contains('liste_titre'))
    }
  }
  return []
}

export function parseInventoryCardDocument(doc: Document, id: number): InventoryCard {
  function fieldValue(fieldClass: string): Element | undefined {
    return doc.querySelector(`.fieldname_${fieldClass}.valuefield`) ?? undefined
  }

  const label = (fieldValue('title')?.textContent ?? '').trim()
  const warehouseCell = fieldValue('fk_warehouse')
  const warehouseLink = warehouseCell?.querySelector('a[href*="stock/card.php?id="]')
  const warehouseIdMatch = warehouseLink?.getAttribute('href')?.match(/[?&]id=(\d+)/)
  const productCell = fieldValue('fk_product')
  const productLink = productCell?.querySelector('a[href*="product.php?id="]')
  const productIdMatch = productLink?.getAttribute('href')?.match(/[?&]id=(\d+)/)
  const valueDate = (fieldValue('date_inventory')?.textContent ?? '').trim()
  const statusLabel = (doc.querySelector('.badge-status')?.textContent ?? '').trim()

  const emailLink = doc.querySelector('a[href*="action=presend"]')
  const modifyLink = doc.querySelector('a[href*="action=edit"][href*="inventory/card.php"]')
  const validateLink = doc.querySelector('a[href*="action=confirm_validate"]')
  const deleteLink = doc.querySelector('a.butActionDelete, a[href*="action=delete"][href*="inventory/card.php"]')

  const relatedObjects: RelatedObjectRow[] = parseGenericTableRows(doc, ['Type', 'Ref.', 'Date', 'Amount (Excl.)', 'Status'])
    .map((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) return null
      return {
        type: (cells[0]?.textContent ?? '').trim(),
        ref: (cells[1]?.textContent ?? '').trim(),
        date: (cells[2]?.textContent ?? '').trim(),
        amount: (cells[3]?.textContent ?? '').trim(),
        statusLabel: (cells[4]?.textContent ?? '').trim(),
      }
    })
    .filter((r): r is RelatedObjectRow => !!r && r.type.toLowerCase() !== 'none')

  const linkedEvents: LinkedEventRow[] = parseGenericTableRows(doc, ['Ref.', 'Date', 'By', 'Type', 'Title'])
    .map((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) return null
      return {
        ref: (cells[0]?.textContent ?? '').trim(),
        date: (cells[1]?.textContent ?? '').trim(),
        by: (cells[2]?.textContent ?? '').trim(),
        type: (cells[3]?.textContent ?? '').trim(),
        title: (cells[4]?.textContent ?? '').trim(),
      }
    })
    .filter((r): r is LinkedEventRow => !!r && r.ref.toLowerCase() !== 'none')

  return {
    id,
    label,
    warehouseId: warehouseIdMatch ? Number(warehouseIdMatch[1]) : null,
    warehouseLabel: (warehouseCell?.textContent ?? '').trim(),
    productId: productIdMatch ? Number(productIdMatch[1]) : null,
    productLabel: (productCell?.textContent ?? '').trim(),
    valueDate,
    statusLabel,
    emailUrl: emailLink?.getAttribute('href') ?? '',
    modifyUrl: modifyLink?.getAttribute('href') ?? '',
    validateUrl: validateLink?.getAttribute('href') ?? '',
    deleteUrl: deleteLink?.getAttribute('href') ?? '',
    relatedObjects,
    linkedEvents,
  }
}

// product/stock/movement_list.php is a JS SPA shell — its real data comes
// from a genuine JSON AJAX API (product/stock/ajax/movement_list_api.php,
// action=get_page_data), read directly from that PHP file rather than
// guessed from the rendered page. Every field name below matches that
// file's own $response['data'] array exactly. The one HTML fragment in the
// payload (`origin`, built server-side via MouvementStock::get_origin(), an
// `<a>` tag or '') is parsed with DOMParser like every other HTML-in-JSON
// cell in this app (see societeListParser.ts).
export interface WarehouseMovementStats {
  saleUseQty: string
  saleUseToday: string
  soldQty: string
  soldToday: string
  purchaseQty: string
  purchaseToday: string
  lotUsedCount: string
  lotUsedToday: string
  correctionCount: string
  correctionToday: string
}

export interface WarehouseMovementRow {
  id: number
  dateFormatted: string
  productRef: string
  productLabel: string
  batch: string
  inventoryCode: string
  label: string
  typeLabel: string
  originText: string
  originUrl: string
  costPrice: string
  qtyDisplay: string
  zraStatusLabel: string
}

export interface WarehouseMovementsData {
  stats: WarehouseMovementStats
  movements: WarehouseMovementRow[]
  totalRecords: number
  page: number
  limit: number
  products: { id: number; ref: string; label: string }[]
  batches: string[]
  inventoryCodes: string[]
  dateRange: string
  zraEnabled: boolean
}

function parseOriginHtml(html: string): { text: string; url: string } {
  if (!html) return { text: '', url: '' }
  const frag = new DOMParser().parseFromString(html, 'text/html')
  const link = frag.querySelector('a')
  if (link) return { text: (link.textContent ?? '').trim(), url: link.getAttribute('href') ?? '' }
  return { text: (frag.body.textContent ?? '').trim(), url: '' }
}

// The raw JSON shape isn't worth a full interface (it's a big, loosely
// typed PHP array dump) — callers pass `response.data` straight through.
export function parseMovementListApiResponse(data: any): WarehouseMovementsData {
  const stats = data.stats_formatted ?? {}
  const movements: WarehouseMovementRow[] = Array.isArray(data.movements)
    ? data.movements.map((m: any) => {
        const origin = parseOriginHtml(m.origin ?? '')
        return {
          id: Number(m.mid),
          dateFormatted: m.datem_formatted ?? '',
          productRef: m.product_ref ?? '',
          productLabel: m.product_label ?? '',
          batch: m.batch ?? '',
          inventoryCode: m.inventorycode ?? '',
          label: m.label ?? '',
          typeLabel: m.type_label ?? '',
          originText: origin.text,
          originUrl: origin.url,
          costPrice: m.cost_price ?? '',
          qtyDisplay: m.qty_display ?? '',
          zraStatusLabel: m.zra_status_display ?? '',
        }
      })
    : []

  return {
    stats: {
      saleUseQty: stats.sale_use_qty ?? '0',
      saleUseToday: stats.sale_use_today ?? '0',
      soldQty: stats.sold_qty ?? '0',
      soldToday: stats.sold_today ?? '0',
      purchaseQty: stats.purchase_qty ?? '0',
      purchaseToday: stats.purchase_today ?? '0',
      lotUsedCount: stats.lot_used_count ?? '0',
      lotUsedToday: stats.lot_used_today ?? '0',
      correctionCount: stats.correction_count ?? '0',
      correctionToday: stats.correction_today ?? '0',
    },
    movements,
    totalRecords: Number(data.nbtotalofrecords ?? movements.length),
    page: Number(data.pagination?.page ?? 0),
    limit: Number(data.pagination?.limit ?? 250),
    products: Array.isArray(data.filters?.products) ? data.filters.products.map((p: any) => ({ id: Number(p.id), ref: p.ref, label: p.label })) : [],
    batches: Array.isArray(data.filters?.batches) ? data.filters.batches : [],
    inventoryCodes: Array.isArray(data.filters?.inventory_codes) ? data.filters.inventory_codes : [],
    dateRange: data.date_range ?? '',
    zraEnabled: !!data.zra_enabled,
  }
}

// product/stock/events.php's "Linked files" table has no tr.liste_titre
// header row (it's FormFile::showdocuments()'s form-controls table), so it
// can't use parseGenericTableRows above. Its one stable, real anchor is the
// literal `id="builddoc_generatebutton"` button printed right before the
// file rows in that same table (verified against the real fetched HTML —
// the empty state is a single `<tr><td colspan="4">None</td></tr>` row
// right after it). The "Latest 10 linked events" table below it DOES share
// the exact ['Ref.','Date','By','Type','Title'] header already handled by
// parseGenericTableRows for Inventory Detail, so it's reused as-is.
//
// The real page's own "Doc template"/language dropdowns + Generate button
// (a POST of action=builddoc back to this same page) are deliberately NOT
// rebuilt here: live-tested against the real backend (POSTing the exact
// same model=standard/lang_id/token it submits) and it silently produces no
// file — "Linked files" still reads None afterwards, so the stock module's
// "standard" ODT/PDF template is missing or misconfigured server-side on
// this deployment. Rebuilding a Generate button that replicates this
// no-op would just be a second copy of a real backend bug (frontend-only
// scope on this app; backend PHP is never edited).
export interface WarehouseLinkedFile {
  name: string
  url: string
}

export interface WarehouseEventsData {
  linkedFiles: WarehouseLinkedFile[]
  events: LinkedEventRow[]
  addEventUrl: string
  createdByName: string
  createdByUrl: string
  creationDate: string
  lastModificationDate: string
}

export function parseWarehouseEventsDocument(doc: Document): WarehouseEventsData {
  const generateBtn = doc.querySelector('#builddoc_generatebutton')
  const controlRow = generateBtn?.closest('tr') ?? null
  const fileRows: Element[] = []
  let sib = controlRow?.nextElementSibling ?? null
  while (sib && sib.tagName === 'TR') {
    fileRows.push(sib)
    sib = sib.nextElementSibling
  }
  const linkedFiles: WarehouseLinkedFile[] = fileRows
    .map((row) => {
      const text = (row.textContent ?? '').trim()
      if (!text || text.toLowerCase() === 'none') return null
      const link = row.querySelector('a')
      if (link) return { name: (link.textContent ?? '').trim(), url: link.getAttribute('href') ?? '' }
      return { name: text, url: '' }
    })
    .filter((f): f is WarehouseLinkedFile => !!f)

  const events: LinkedEventRow[] = parseGenericTableRows(doc, ['Ref.', 'Date', 'By', 'Type', 'Title'])
    .map((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) return null
      return {
        ref: (cells[0]?.textContent ?? '').trim(),
        date: (cells[1]?.textContent ?? '').trim(),
        by: (cells[2]?.textContent ?? '').trim(),
        type: (cells[3]?.textContent ?? '').trim(),
        title: (cells[4]?.textContent ?? '').trim(),
      }
    })
    .filter((r): r is LinkedEventRow => !!r && r.ref.toLowerCase() !== 'none')

  const addEventUrl = doc.querySelector('a[title="AddEvent"]')?.getAttribute('href') ?? ''

  // The top nav's own "My Account" link shares this exact href pattern and
  // comes first in document order, so the real "Created by" anchor (whose
  // parent div's text also has "Creation date:") has to be picked out of
  // *all* matches rather than taking the first one.
  const createdByLink = Array.from(doc.querySelectorAll('a[href*="/userprofile/index.php?id="]')).find((a) =>
    (a.parentElement?.textContent ?? '').includes('Creation date:'),
  )
  const infoDiv = createdByLink?.parentElement ?? null
  const infoText = infoDiv?.textContent ?? ''
  const creationMatch = infoText.match(/Creation date:\s*(.*?)(?=Latest modification date:|$)/)
  const modificationMatch = infoText.match(/Latest modification date:\s*(.*)$/)

  return {
    linkedFiles,
    events,
    addEventUrl,
    createdByName: (createdByLink?.querySelector('.usertext')?.textContent ?? createdByLink?.textContent ?? '').trim(),
    createdByUrl: createdByLink?.getAttribute('href') ?? '',
    creationDate: (creationMatch?.[1] ?? '').trim(),
    lastModificationDate: (modificationMatch?.[1] ?? '').trim(),
  }
}
