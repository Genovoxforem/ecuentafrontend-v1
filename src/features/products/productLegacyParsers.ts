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
