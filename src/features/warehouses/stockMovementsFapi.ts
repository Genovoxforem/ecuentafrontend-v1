import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { StockMovementFilters, StockMovementRow, StockMovementsPageData } from './stockMovementsList.queries'

// product/stock/fapi/movements.php (list, stats, options) and zra_stock_update.php (23 Oct 2026), replacing the session-only
// product/stock/ajax/movement_list_api.php and zraupdatestock.php. Answers were captured from newecuenta on 23 Oct 2026
// (tests/fixtures/stock-movements-fapi.json, stock-movements-options.json). The period defaults to the current month when no date is sent.
// The ZRA update is documented from code only (ZRA is off on newecuenta): it is a dry run unless dry_run:false is sent, 25 movements per call.

export interface FapiMovement {
  id: number
  date: string
  product_id: number
  product_ref: string
  product_label: string
  warehouse_id: number
  warehouse_ref: string
  qty: number
  type: number
  type_label: string
  label: string
  inventory_code: string | null
  batch: string | null
  cost_price: number
  origin_ref: string | null
  origin_route: string | null
  user_login: string
  user_name: string
  zra_status: string | null
  zra_sent_ok: boolean
}

export interface FapiMovementStats {
  sale_use_qty: number
  sale_use_today: number
  sold_qty: number
  sold_today: number
  purchase_qty: number
  purchase_today: number
  lot_used_count: number
  lot_used_today: number
  correction_count: number
  correction_today: number
}

export interface FapiMovementList {
  items: FapiMovement[]
  pagination: { page: number; limit: number; total: number; pages: number }
  stats: FapiMovementStats
}

export interface FapiMovementOptions {
  filter_options: { products: Array<{ id: number; ref: string; label: string }>; lots: string[]; inventory_codes: string[] }
}

const pad = (n: number) => String(n).padStart(2, '0')
// "MM/dd/yyyy HH:mm", the way the page printed a movement's date.
const stamp = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const mapMovement = (m: FapiMovement): StockMovementRow => ({
  id: m.id,
  productId: m.product_id,
  productRef: m.product_ref,
  productLabel: m.product_label,
  batch: m.batch,
  dateFormatted: stamp(m.date),
  warehouseId: m.warehouse_id,
  warehouseRef: m.warehouse_ref,
  author: m.user_name || m.user_login,
  inventoryCode: m.inventory_code,
  label: m.label,
  typeMouvement: String(m.type),
  typeLabel: m.type_label,
  originRef: m.origin_ref ?? '',
  originUrl: m.origin_route ?? '',
  costPrice: m.cost_price ? String(m.cost_price) : '',
  qty: String(m.qty),
  zraStatusDisplay: m.zra_status ?? '',
  zraStatusClass: m.zra_sent_ok ? 'badge-success' : m.zra_status ? 'badge-danger' : '',
})

// "MM/DD/YYYY-MM/DD/YYYY" -> the two ISO dates.
export function isoRange(range: string | undefined): { date_start?: string; date_end?: string } {
  const m = (range ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})-(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? { date_start: `${m[3]}-${m[1]}-${m[2]}`, date_end: `${m[6]}-${m[4]}-${m[5]}` } : {}
}

export function mapMovementList(d: FapiMovementList, o: FapiMovementOptions): StockMovementsPageData {
  return {
    stats: {
      saleUseQty: d.stats.sale_use_qty,
      saleUseToday: d.stats.sale_use_today,
      soldQty: d.stats.sold_qty,
      soldToday: d.stats.sold_today,
      purchaseQty: d.stats.purchase_qty,
      purchaseToday: d.stats.purchase_today,
      lotUsedCount: d.stats.lot_used_count,
      lotUsedToday: d.stats.lot_used_today,
      correctionCount: d.stats.correction_count,
      correctionToday: d.stats.correction_today,
    },
    products: o.filter_options.products.map((p) => ({ id: String(p.id), ref: p.ref, label: p.label })),
    batches: o.filter_options.lots,
    inventoryCodes: o.filter_options.inventory_codes,
    movements: d.items.map(mapMovement),
    totalRecords: d.pagination.total,
  }
}

export async function loadStockMovements(f: StockMovementFilters): Promise<StockMovementsPageData> {
  const [list, options] = await Promise.all([
    fapiGet<FapiMovementList>('/product/stock/fapi/movements.php', {
      limit: f.limit ?? 250,
      warehouse_id: f.warehouseId,
      product_id: f.productId,
      batch: f.batch,
      inventory_code: f.inventoryCode,
      search: f.search,
      ...isoRange(f.dateRange),
    }),
    fapiGet<FapiMovementOptions>('/product/stock/fapi/movements.php', { action: 'options' }),
  ])
  return mapMovementList(list, options)
}

// Sends the selected movements to ZRA Smart Invoice, 25 per call (the endpoint's limit). Resolves to the ids it reported as sent.
export async function sendMovementsToZra(ids: number[]): Promise<Array<{ rowid: number; ok: boolean }>> {
  const results: Array<{ rowid: number; ok: boolean }> = []
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25)
    try {
      await fapiPost('/product/stock/fapi/zra_stock_update.php', { movement_ids: chunk, dry_run: false })
      for (const rowid of chunk) results.push({ rowid, ok: true })
    } catch {
      // A refused call (ZRA off, a product without an item code) fails the whole chunk: every movement in it is reported as not sent.
      for (const rowid of chunk) results.push({ rowid, ok: false })
    }
  }
  return results
}
