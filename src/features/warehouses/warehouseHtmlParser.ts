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
 