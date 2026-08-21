// Parses several legacy Dolibarr product pages that have no REST API —
// Stocks/location, Stocks by lot-serial, Lots/Serials, Variant Attributes,
// and Product/Service Statistics. Same approach as ledgerHtmlParser.ts /
// warehouseHtmlParser.ts: verified against real fetched HTML from the live
// local backend, not guessed from screenshots. See productAjax.ts for the
// separate (and more robust) JSON-AJAX approach used for the main product
// list, which these smaller reports don't have.

function cellText(cell: Element | undefined | null): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(text: string): number {
  const cleaned = text.replace(/,/g, '').trim()
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

// The common "<a><...>Label<span class='small text-muted'>Ref: X</span></a>"
// linked-cell pattern used across every one of these pages (and the ledger
// pages before them).
function extractLinkedLabel(cell: Element | null | undefined): { label: string; ref: string; url: string | null } {
  const link = cell?.querySelector('a') ?? null
  const small = cell?.querySelector('.small, .text-muted') ?? null
  const ref = (small?.textContent ?? '').replace(/^Ref:\s*/i, '').trim()
  let label = ''
  if (link) {
    const clone = link.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.small, .text-muted').forEach((el) => el.remove())
    label = clone.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  } else {
    label = cellText(cell)
  }
  return { label, ref, url: link?.getAttribute('href') ?? null }
}

// The same colored circular icon badge markup used by the AJAX product
// list (see productAjax.ts's avatarBg/avatarColor) — reassort.php and
// reassortlot.php render it inline in the same first cell as the
// ref/label link, confirmed against real fetched HTML.
function extractAvatarStyle(cell: Element | null | undefined): { bg: string | null; color: string | null } {
  const badge = cell?.querySelector('.rounded-circle[style*="background-color"]') as HTMLElement | null
  const icon = badge?.querySelector('i') as HTMLElement | null
  return { bg: badge?.style.backgroundColor || null, color: icon?.style.color || null }
}

// A stale/missing DOLSESSID cookie (see legacySession.ts) silently redirects
// to Dolibarr's own login page instead of the real report.
export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !!doc.querySelector('input[name="password"]')
}

// ---------------------------------------------------------------------------
// Stocks and location of products (product/reassort.php) — client-side
// DataTables, full dataset embedded (small enough not to paginate).

export interface StockLocationRow {
  ref: string
  label: string
  cardUrl: string | null
  stockLimitForAlert: number
  desiredStock: number
  physicalStock: number
  virtualStock: number
  movementsUrl: string | null
  forSale: string
  forPurchase: string
  avatarBg: string | null
  avatarColor: string | null
}

export function parseProductStocks(doc: Document): StockLocationRow[] {
  const table = Array.from(doc.querySelectorAll<HTMLTableElement>('table.ec-product-table')).find((t) => t.querySelectorAll('tbody tr').length > 0)
  if (!table) return []
  return Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
    const cells = Array.from(tr.children)
    const { label, ref, url } = extractLinkedLabel(cells[0])
    const { bg, color } = extractAvatarStyle(cells[0])
    const movementsLink = cells[6]?.querySelector('a')
    return {
      ref,
      label,
      cardUrl: url,
      stockLimitForAlert: parseAmount(cellText(cells[2])),
      desiredStock: parseAmount(cellText(cells[3])),
      physicalStock: parseAmount(cellText(cells[4])),
      virtualStock: parseAmount(cellText(cells[5])),
      movementsUrl: movementsLink?.getAttribute('href') ?? null,
      forSale: cellText(cells[7]),
      forPurchase: cellText(cells[8]),
      avatarBg: bg,
      avatarColor: color,
    }
  })
}

// ---------------------------------------------------------------------------
// Stocks by lot/serial (product/reassortlot.php) — plain server-rendered table.

export interface StockByLotRow {
  ref: string
  label: string
  cardUrl: string | null
  warehouse: string
  lotSerial: string
  eatByDate: string
  sellByDate: string
  physicalStock: number
  movementsUrl: string | null
  forSale: string
  forPurchase: string
  avatarBg: string | null
  avatarColor: string | null
}

export function parseProductStocksByLot(doc: Document): StockByLotRow[] {
  const header = Array.from(doc.querySelectorAll('th')).find((th) => th.textContent?.trim() === 'Lot/Serial')
  const table = header?.closest('table')
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr')).filter((tr) => !tr.className.includes('liste_titre') && tr.children.length >= 10)
  return rows.map((tr) => {
    const cells = Array.from(tr.children)
    const { label, ref, url } = extractLinkedLabel(cells[0])
    const { bg, color } = extractAvatarStyle(cells[0])
    const movementsLink = cells[7]?.querySelector('a')
    return {
      ref,
      label,
      cardUrl: url,
      warehouse: cellText(cells[2]),
      lotSerial: cellText(cells[3]),
      eatByDate: cellText(cells[4]),
      sellByDate: cellText(cells[5]),
      physicalStock: parseAmount(cellText(cells[6])),
      movementsUrl: movementsLink?.getAttribute('href') ?? null,
      forSale: cellText(cells[8]),
      forPurchase: cellText(cells[9]),
      avatarBg: bg,
      avatarColor: color,
    }
  })
}

// ---------------------------------------------------------------------------
// List of Lot/Serials (product/stock/productlot_list.php) — plain
// oddeven-row table, matches the same shape as Ledger/Journals rows.

export interface LotSerialRow {
  lotSerial: string
  lotSerialUrl: string | null
  productRef: string
  productLabel: string
  productUrl: string | null
  sellByDate: string
  eatByDate: string
  creationDate: string
}

export function parseLotSerials(doc: Document): LotSerialRow[] {
  const header = Array.from(doc.querySelectorAll('th')).find((th) => th.textContent?.trim() === 'Lot/Serial')
  const table = header?.closest('table')
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr.oddeven'))
  return rows.map((tr) => {
    const cells = Array.from(tr.children)
    const lotLink = cells[1]?.querySelector('a')
    const { label: productLabel, ref: productRef, url: productUrl } = extractLinkedLabel(cells[2])
    return {
      lotSerial: cellText(cells[1]),
      lotSerialUrl: lotLink?.getAttribute('href') ?? null,
      productRef,
      productLabel,
      productUrl,
      sellByDate: cellText(cells[3]),
      eatByDate: cellText(cells[4]),
      creationDate: cellText(cells[5]),
    }
  })
}

// ---------------------------------------------------------------------------
// Variant attributes for products (variants/list.php).

export interface VariantAttributeRow {
  ref: string
  label: string
  url: string | null
  valuesCount: number
  productsCount: number
}

export function parseVariantAttributes(doc: Document): VariantAttributeRow[] {
  const header = Array.from(doc.querySelectorAll('th')).find((th) => th.textContent?.trim().toLowerCase().includes('different values'))
  const table = header?.closest('table')
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr')).filter((tr) => tr.className.includes('oddeven'))
  return rows.map((tr) => {
    const cells = Array.from(tr.children)
    const link = cells[0]?.querySelector('a')
    return {
      ref: cellText(cells[0]),
      label: cellText(cells[1]),
      url: link?.getAttribute('href') ?? null,
      valuesCount: parseAmount(cellText(cells[2])),
      productsCount: parseAmount(cellText(cells[3])),
    }
  })
}

// ---------------------------------------------------------------------------
// Products/Services Statistics (product/stats/card.php) — real Chart.js bar
// data embedded in per-card <script> tags (never executed by DOMParser, just
// read as text). Verified: the 6 report cards' totals and 12-month arrays
// both cross-checked against the live page.

export interface ProductStatSeries {
  label: string
  total: number
  monthly: number[]
}

export function parseProductStats(doc: Document): ProductStatSeries[] {
  const cards = Array.from(doc.querySelectorAll('.card.mb-3'))
  const series: ProductStatSeries[] = []
  for (const card of cards) {
    const headerSpan = card.querySelector('.card-header span')
    const titleNode = headerSpan?.childNodes[0]
    const title = titleNode?.textContent?.trim() ?? ''
    const totalSpan = card.querySelector('.card-header .opacity-50')
    const total = parseAmount((totalSpan?.textContent ?? '').replace(/[()]/g, ''))
    const scriptText = card.querySelector('script')?.textContent ?? ''
    const m = /data:\s*\[([\d,\s]*)\]\}/i.exec(scriptText)
    const monthly = m
      ? m[1]
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : []
    if (!title || monthly.length === 0) continue
    series.push({ label: title, total, monthly })
  }
  return series
}

// ---------------------------------------------------------------------------
// Row-click detail panel (product/load_product_image.php) — a small HTML
// FRAGMENT (no <html>/<head>), not a full page like the reports above, but
// DOMParser still parses it fine into doc.body. Verified against real
// fetched fragments for two live products (one with real warehouse stock,
// one without) — no product on this install has an uploaded image yet, so
// the image-box shape below is taken directly from load_product_image.php's
// own PHP source (a plain, unconditional print loop), not guessed.

function textAfterLabel(doc: Document, labelSubstring: string): string {
  const label = Array.from(doc.querySelectorAll('b')).find((b) => b.textContent?.includes(labelSubstring))
  const text = label?.nextSibling?.textContent ?? ''
  // Lines like "Product Price(Incl.tax)</b>: 400.00  ZMW" carry their own
  // ": " separator in the text node (outside the <b>) — strip it uniformly;
  // harmless no-op for lines that don't have one (e.g. "Product ref.:").
  return text.replace(/^:\s*/, '').replace(/\s+/g, ' ').trim()
}

export interface ProductDetailPanel {
  kind: 'product' | 'service'
  // Literal `$object->zracode === '000'` check from load_product_image.php
  // (picks the green icon / "badge-status3" blinking dot vs orange /
  // "badge-status1") — named after the condition itself since the exact
  // real-world meaning of zracode wasn't independently confirmed elsewhere.
  zraCodeIsDefault: boolean
  ref: string
  label: string
  zraProductCode: string
  priceInclTax: string
  rrp: string
  classificationCode: string
  images: { thumbUrl: string; fullUrl: string }[]
  warehouseStock: { warehouse: string; warehouseUrl: string | null; quantity: number }[]
  totalStock: number
  notFound: boolean
}

export function parseProductDetailPanel(doc: Document): ProductDetailPanel {
  if (doc.body.textContent?.includes('Product not found')) {
    return {
      kind: 'product',
      zraCodeIsDefault: false,
      ref: '',
      label: '',
      zraProductCode: '',
      priceInclTax: '',
      rrp: '',
      classificationCode: '',
      images: [],
      warehouseStock: [],
      totalStock: 0,
      notFound: true,
    }
  }

  const kind: 'product' | 'service' = doc.body.textContent?.includes('Service') && !doc.body.textContent?.includes('Product') ? 'service' : 'product'
  const zraCodeIsDefault = !!doc.querySelector('.badge-status3')

  const images = Array.from(doc.querySelectorAll('.productDetailsModalBox')).map((box) => {
    const link = box.querySelector('a')
    const img = box.querySelector('img')
    return {
      fullUrl: link?.getAttribute('href') ?? '',
      thumbUrl: img?.getAttribute('data-lazy') ?? img?.getAttribute('src') ?? '',
    }
  })

  const warehouseTable = doc.querySelector('#nav-profile table')
  const warehouseStock = Array.from(warehouseTable?.querySelectorAll('tr') ?? [])
    .filter((tr) => !tr.className.includes('tbold') && !tr.className.includes('liste_total'))
    .map((tr) => {
      const cells = Array.from(tr.children)
      const link = cells[0]?.querySelector('a')
      return {
        warehouse: cellText(cells[0]),
        warehouseUrl: link?.getAttribute('href') ?? null,
        quantity: parseAmount(cellText(cells[1])),
      }
    })
  const totalRow = Array.from(warehouseTable?.querySelectorAll('tr.liste_total') ?? [])[0]
  const totalStock = parseAmount(cellText(Array.from(totalRow?.children ?? [])[1]))

  return {
    kind,
    zraCodeIsDefault,
    ref: textAfterLabel(doc, 'Product ref.'),
    label: textAfterLabel(doc, 'Product label'),
    zraProductCode: textAfterLabel(doc, 'ZRA Product Code'),
    priceInclTax: textAfterLabel(doc, 'Product Price'),
    rrp: textAfterLabel(doc, 'RRP'),
    classificationCode: textAfterLabel(doc, 'Classification Code'),
    images,
    warehouseStock,
    totalStock,
    notFound: false,
  }
}

// ---------------------------------------------------------------------------
// Header meta (product/card.php's own "ec-prod-card__meta" banner row) —
// origin country/manufacturer/creation date, which api/products/
// ?action=detail stopped returning on the currently-active backend (present
// in every RawProductDetail field, just empty). This custom, Ecuenta-built
// markup (not stock Dolibarr) has the same 4 icon+text pairs the React hero
// header already shows plus one more, in a fixed order — confirmed against
// the real fetched page for product id=123 ("Zktecho"): fa-tag (type),
// fa-location-dot (origin country), fa-industry (manufacturer/vendor),
// fa-calendar ("Created MM/DD/YYYY hh:mm AM|PM").

function metaText(container: Element | null, iconClass: string): string {
  const icon = container?.querySelector(`i.${iconClass}`)
  return cellText(icon?.parentElement?.querySelector('span') ?? null)
}

const CARD_DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i

// The "Country" row further down the same page (About section) renders a
// flag <img title="ZM"> next to the label text — the real ISO code, unlike
// the meta banner's own plain-text country name. Structure confirmed live:
// <div><label>Country</label></div><div><img title="ZM">Zambia</div>.
function originCountryCodeOf(doc: Document): string {
  const label = Array.from(doc.querySelectorAll('label')).find((el) => el.textContent?.trim() === 'Country')
  const valueCell = label?.parentElement?.nextElementSibling
  return valueCell?.querySelector('img[title]')?.getAttribute('title') ?? ''
}

export interface ProductCardMeta {
  originCountry: string
  originCountryCode: string
  manufacturer: string
  // ISO string, or '' if the "Created ..." text didn't match the expected
  // format — regex-parsed into real Date parts rather than passed through
  // raw, so it stays a reliably new Date()-parseable value across browsers
  // (same reasoning as societeListParser.ts's date handling).
  createdAtIso: string
}

export function parseProductCardMeta(doc: Document): ProductCardMeta {
  const meta = doc.querySelector('.ec-prod-card__meta')
  const originCountry = metaText(meta, 'fa-location-dot')
  const manufacturer = metaText(meta, 'fa-industry')
  const createdText = metaText(meta, 'fa-calendar').replace(/^Created\s*/i, '')

  const match = CARD_DATE_RE.exec(createdText)
  let createdAtIso = ''
  if (match) {
    const [, month, day, year, hourRaw, minute, ampm] = match
    let hour = Number(hourRaw) % 12
    if (ampm.toUpperCase() === 'PM') hour += 12
    createdAtIso = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute)).toISOString()
  }

  return { originCountry, originCountryCode: originCountryCodeOf(doc), manufacturer, createdAtIso }
}

// ---------------------------------------------------------------------------
// Documents tab shape — now fed by productinfo/api/document_api.php (real
// filesystem listing) instead of scraping product/document.php; kept here
// since it's still the shared type products.queries.ts's useProductDocuments
// returns.
export interface ProductDocumentRow {
  fileName: string
  fileUrl: string | null
  size: string
  date: string
}

// ---------------------------------------------------------------------------
// Edit wizard (productinfo/api/edit_wizard.php) — returns a real, pre-filled
// HTML form fragment (Dolibarr's own Form/FormProduct select widgets,
// server-rendered), not JSON. There's no working JSON options source for
// this data on the active backend (api/zra/product-form-options/ 404s,
// confirmed live), so this scrapes the one place the real dropdown options
// AND the product's current selections both already exist together — every
// selector below verified against the real fetched fragment for product
// id=123, not guessed from the PHP source alone. `<select>`/`<option>`
// .value reflects the `selected` attribute correctly even in a
// DOMParser-produced document (a spec-level IDL property, not something
// that needs live rendering), so reading `select.value` directly is
// reliable for "which option is currently selected".

export interface EditWizardOption {
  value: string
  label: string
}

function optionsOf(doc: Document, name: string): EditWizardOption[] {
  const select = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  if (!select) return []
  return Array.from(select.options).map((o) => ({ value: o.value, label: cellText(o) }))
}
function selectedOf(doc: Document, name: string): string {
  return doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)?.value ?? ''
}
function selectedManyOf(doc: Document, name: string): string[] {
  const select = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  if (!select) return []
  return Array.from(select.selectedOptions).map((o) => o.value)
}
function inputValueOf(doc: Document, selector: string): string {
  return doc.querySelector<HTMLInputElement>(selector)?.value ?? ''
}

export interface EditWizardFormData {
  prodType: 0 | 1
  label: string
  ref: string
  barcode: string
  description: string
  // Just the raw code (e.g. "10101505") — confirmed live, the real input
  // carries no separate label text, unlike ClassificationSearch's own
  // combined "code_label" display convention used elsewhere in this app.
  itemClassification: string
  statutOptions: EditWizardOption[]
  statut: string
  statutBuyOptions: EditWizardOption[]
  statutBuy: string
  finishedOptions: EditWizardOption[]
  finished: string
  countryOptions: EditWizardOption[]
  countryId: string
  unitsOptions: EditWizardOption[]
  units: string
  packingOptions: EditWizardOption[]
  packing: string
  hasWarehouseSection: boolean
  warehouseOptions: EditWizardOption[]
  warehouseId: string
  manufacturerOptions: EditWizardOption[]
  manufacturerId: string
  categoryOptions: EditWizardOption[]
  categoryIds: string[]
  isZra: boolean
  manufactuterTpin: string
  manufacturerItemCd: string
  rrp: string
  hasStockFields: boolean
  seuilStockAlerte: string
  desiredStock: string
  hasShippingFields: boolean
  weight: string
  weightUnitOptions: EditWizardOption[]
  weightUnit: string
  length: string
  width: string
  height: string
  sizeUnitOptions: EditWizardOption[]
  sizeUnit: string
  isService: boolean
  durationValue: string
  durationUnitOptions: EditWizardOption[]
  durationUnit: string
  // Hidden passthrough fields this wizard never edits (price/tax) — resent
  // unchanged on submit so product_api.php's update action doesn't zero
  // them out (it always reads and reapplies whatever these carry).
  hiddenPrice: string
  hiddenPriceMin: string
  hiddenPriceBaseType: string
  hiddenTvaTx: string
  hiddenIplCatCd: string
  hiddenTlCatCd: string
  hiddenExciseTxCatCd: string
}

export function parseEditWizardForm(doc: Document): EditWizardFormData {
  const prodType = (inputValueOf(doc, 'input[name="prod_type"]') === '1' ? 1 : 0) as 0 | 1
  return {
    prodType,
    label: inputValueOf(doc, 'input[name="label"]'),
    ref: inputValueOf(doc, 'input[name="ref"]'),
    barcode: inputValueOf(doc, 'input[name="barcode"]'),
    description: doc.querySelector<HTMLTextAreaElement>('textarea[name="description"]')?.value ?? '',
    itemClassification: inputValueOf(doc, 'input[name="itemclassification"]'),
    statutOptions: optionsOf(doc, 'statut'),
    statut: selectedOf(doc, 'statut'),
    statutBuyOptions: optionsOf(doc, 'statut_buy'),
    statutBuy: selectedOf(doc, 'statut_buy'),
    finishedOptions: optionsOf(doc, 'finished'),
    finished: selectedOf(doc, 'finished'),
    countryOptions: optionsOf(doc, 'country_id'),
    countryId: selectedOf(doc, 'country_id'),
    unitsOptions: optionsOf(doc, 'units'),
    units: selectedOf(doc, 'units'),
    packingOptions: optionsOf(doc, 'packing'),
    packing: selectedOf(doc, 'packing'),
    hasWarehouseSection: !!doc.querySelector('select[name="fk_default_warehouse"]'),
    warehouseOptions: optionsOf(doc, 'fk_default_warehouse'),
    warehouseId: selectedOf(doc, 'fk_default_warehouse'),
    manufacturerOptions: optionsOf(doc, 'manufacturer_id'),
    manufacturerId: selectedOf(doc, 'manufacturer_id'),
    categoryOptions: optionsOf(doc, 'categories[]'),
    categoryIds: selectedManyOf(doc, 'categories[]'),
    isZra: !!doc.querySelector('input[name="manufactuterTpin"]'),
    manufactuterTpin: inputValueOf(doc, 'input[name="manufactuterTpin"]'),
    manufacturerItemCd: inputValueOf(doc, 'input[name="manufacturerItemCd"]'),
    rrp: inputValueOf(doc, 'input[name="rrp"]'),
    hasStockFields: !!doc.querySelector('input[name="seuil_stock_alerte"][type="text"]'),
    seuilStockAlerte: inputValueOf(doc, 'input[name="seuil_stock_alerte"]'),
    desiredStock: inputValueOf(doc, 'input[name="desiredstock"]'),
    hasShippingFields: !!doc.querySelector('input[name="weight"]'),
    weight: inputValueOf(doc, 'input[name="weight"]'),
    weightUnitOptions: optionsOf(doc, 'weight_units'),
    weightUnit: selectedOf(doc, 'weight_units'),
    length: inputValueOf(doc, 'input[name="size"]'),
    width: inputValueOf(doc, 'input[name="sizewidth"]'),
    height: inputValueOf(doc, 'input[name="sizeheight"]'),
    sizeUnitOptions: optionsOf(doc, 'size_units'),
    sizeUnit: selectedOf(doc, 'size_units'),
    isService: !!doc.querySelector('input[name="duration_value"]'),
    durationValue: inputValueOf(doc, 'input[name="duration_value"]'),
    durationUnitOptions: optionsOf(doc, 'duration_unit'),
    durationUnit: selectedOf(doc, 'duration_unit'),
    hiddenPrice: inputValueOf(doc, 'input[name="price"]'),
    hiddenPriceMin: inputValueOf(doc, 'input[name="price_min"]'),
    hiddenPriceBaseType: inputValueOf(doc, 'input[name="price_base_type"]'),
    hiddenTvaTx: inputValueOf(doc, 'input[name="tva_tx"]'),
    hiddenIplCatCd: inputValueOf(doc, 'input[name="iplCatCd"]'),
    hiddenTlCatCd: inputValueOf(doc, 'input[name="tlCatCd"]'),
    hiddenExciseTxCatCd: inputValueOf(doc, 'input[name="exciseTxCatCd"]'),
  }
}
