// Fetches the richer product/service list from Dolibarr's own DataTables
// server-side AJAX endpoint (product/allproducts_ajax.php) — a 4th variant
// of the "legacy PHP data with no REST API" family (see memory
// legacy_php_data_fetching_patterns.md): unlike the DOMParser-based scrapes
// used elsewhere in this feature, this endpoint already returns JSON, we
// just have to replay the same POST body DataTables itself sends (captured
// from a real logged-in session) with a large `length` to get every row in
// one call instead of paginating.
//
// Row cell values that are chunks of HTML (product name+ref, stock
// breakdown, status badges) are parsed with DOMParser same as everywhere
// else in this codebase — never regex'd out of raw HTML strings.

export interface RichProductRow {
  id: string
  ref: string
  name: string
  productUrl: string | null
  category: string
  price: string
  stockDesired: number
  stockReserved: number
  stockPhysical: number
  classification: string | null
  zraStatus: string
  vatCode: string
  country: string
  createdDate: string
  // Parsed from createdDate ("17,Jun 2026") for real chronological sorting
  // — 0 when unparseable, never fabricated.
  createdAt: number
  lotStatus: string
  // The legacy row's own colored circular icon badge (background + icon
  // color, e.g. "#e8f0fe" / "#397db9") — carried through as-is so the React
  // list can render the same per-product avatar instead of a flat icon.
  avatarBg: string | null
  avatarColor: string | null
}

// Raw shape of one row in the AJAX response's aaData array — every field
// except rowid/category/classification/vat/country/cdate is an HTML
// fragment, matching the real captured response exactly.
interface RawAjaxRow {
  rowid: string
  product: string
  category: string
  pricedet: string
  stock: string
  classification: string | null
  zrastatus: string
  vat: string
  country: string
  cdate: string
  lotstatus: string
}

interface AjaxResponse {
  draw: number
  iTotalRecords: number
  iTotalDisplayRecords: number
  aaData: RawAjaxRow[]
}

function textOf(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

const LEGACY_MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

// "17,Jun 2026" -> real timestamp, or 0 if the format doesn't match (never
// fabricated — callers treat 0 as "unknown", not "epoch").
function parseLegacyDate(cdate: string): number {
  const m = /^(\d{1,2}),\s*([A-Za-z]{3})\s+(\d{4})$/.exec(cdate.trim())
  if (!m) return 0
  const month = LEGACY_MONTHS[m[2].toLowerCase()]
  if (month === undefined) return 0
  return new Date(Number(m[3]), month, Number(m[1])).getTime()
}

function parseRow(raw: RawAjaxRow): RichProductRow {
  const doc = new DOMParser().parseFromString(raw.product, 'text/html')
  const link = doc.querySelector('a')
  const small = doc.querySelector('.small, .text-muted')
  const ref = (small?.textContent ?? '').replace(/^Ref:\s*/i, '').trim()
  const clone = link?.cloneNode(true) as HTMLElement | undefined
  clone?.querySelectorAll('.small, .text-muted').forEach((el) => el.remove())
  const name = clone?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  const avatarSpan = doc.querySelector('.rounded-circle') as HTMLElement | null
  const avatarIcon = doc.querySelector('.rounded-circle i') as HTMLElement | null

  const stockDoc = new DOMParser().parseFromString(raw.stock, 'text/html')
  const stockText = stockDoc.body.textContent ?? ''
  const desired = /Desired:\s*(-?\d+)/.exec(stockText)
  const reserved = /Reserved:\s*(-?\d+)/.exec(stockText)
  const physical = /Physical:\s*(-?\d+)/.exec(stockText)

  const createdDate = raw.cdate ?? ''

  return {
    id: raw.rowid,
    ref,
    name,
    productUrl: link?.getAttribute('href') ?? null,
    category: textOf(raw.category),
    price: raw.pricedet ?? '',
    stockDesired: desired ? Number(desired[1]) : 0,
    stockReserved: reserved ? Number(reserved[1]) : 0,
    stockPhysical: physical ? Number(physical[1]) : 0,
    classification: raw.classification,
    zraStatus: textOf(raw.zrastatus),
    vatCode: raw.vat ?? '',
    country: raw.country ?? '',
    createdDate,
    createdAt: parseLegacyDate(createdDate),
    lotStatus: textOf(raw.lotstatus),
    avatarBg: avatarSpan?.style.backgroundColor || null,
    avatarColor: avatarIcon?.style.color || null,
  }
}

export const NOT_SIGNED_IN_AJAX_MESSAGE = 'Not signed in to the legacy backend — log in again to load this data.'

// Split out from fetchAllProductsRich so it can be verified directly
// against a captured real response body, without mocking fetch/DOMParser.
export function parseAjaxResponseText(text: string): RichProductRow[] {
  const trimmed = text.trim()
  if (trimmed.startsWith('<')) throw new Error(NOT_SIGNED_IN_AJAX_MESSAGE)
  const json = JSON.parse(trimmed) as AjaxResponse
  return (json.aaData ?? []).map(parseRow)
}

// type: 0 = Products, 1 = Services (Dolibarr's own convention, matches
// fk_product_type elsewhere in this codebase).
export async function fetchAllProductsRich(type: 0 | 1): Promise<RichProductRow[]> {
  const body = new URLSearchParams()
  body.set('draw', '1')
  const cols = ['product', 'category', 'vat', 'pricedet', 'stock', 'classification', 'lotstatus', 'country', 'cdate']
  cols.forEach((name, i) => {
    body.set(`columns[${i}][data]`, name)
    body.set(`columns[${i}][searchable]`, 'true')
    body.set(`columns[${i}][orderable]`, 'true')
    body.set(`columns[${i}][search][value]`, '')
    body.set(`columns[${i}][search][regex]`, 'false')
  })
  body.set('start', '0')
  body.set('length', '500')
  body.set('search[value]', '')
  body.set('search[regex]', 'false')
  body.set('changeentity', '0')
  body.set('search_type', '-1')
  body.set('search_finished', '-1')
  body.set('search_tobatch', '-1')
  body.set('search_tosell', '-1')
  body.set('search_tobuy', '-1')
  body.set('stock_filter', '-1')

  const res = await fetch(`/product/allproducts_ajax.php?type=${type}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(NOT_SIGNED_IN_AJAX_MESSAGE)
  const text = await res.text()
  return parseAjaxResponseText(text)
}
