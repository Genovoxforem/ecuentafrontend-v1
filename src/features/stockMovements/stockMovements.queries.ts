import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { formatDateTimeAmPm, formatMoney } from '../../utils/format'
import { preferNewApi } from '../salesOrders/orderApi'
import type { FapiMovement, FapiMovementList } from '../warehouses/stockMovementsFapi'

export interface StockMovementRow {
  id: number
  productRef: string
  productLabel: string
  date: string
  warehouseRef: string
  author: string
  inventoryCode: string
  label: string
  typeLabel: string
  qty: number
  qtyDisplay: string
  costPrice: string
  batch: string
}

export interface StockMovementsData {
  // warehouseCount is null when the figure comes from movements.php, whose product header has no warehouse count (this page does not show it).
  productHeader: { id: number; ref: string; label: string; totalStock: number; warehouseCount: number | null } | null
  warehouseHeader: { id: number; ref: string; label: string; nbDifferentProducts: string; nbProducts: string; stockValue: string; lastMovement: string } | null
  stats: {
    saleUseQty: string
    soldQty: string
    purchaseQty: string
    lotUsedCount: string
    correctionCount: string
  }
  movements: StockMovementRow[]
  total: number
}

interface RawMovement {
  mid: string
  product_ref: string
  produit: string
  datem_formatted: string
  warehouse_ref: string
  user_login: string
  inventorycode: string
  label: string
  type_label: string
  qty: number
  qty_display: string
  cost_price: string
  batch: string
}

interface RawResponse {
  success: boolean
  error?: string
  data: {
    product_header: { id: number; ref: string; label: string; total_stock: number; warehouse_count: number } | null
    warehouse_header: { id: number; ref: string; label: string; nb_different_products: string; nb_products: string; stock_value: string; last_movement: string } | null
    stats_formatted: {
      sale_use_qty: string
      sold_qty: string
      purchase_qty: string
      lot_used_count: string
      correction_count: string
    }
    movements: RawMovement[]
    nbtotalofrecords: string | number
  }
}

// Via product/stock/ajax/movement_list_api.php — the JSON backend for
// product/stock/movement_list.php, itself a custom-built SPA shell for this
// instance (its own "This file renders only a minimal shell" comment).
// hasRight('stock','mouvement','lire') check. Only the read action
// (get_page_data) is wired here — the API also exposes correct_stock/
// transfer_stock/mass_action mutations, left unwired.
async function fetchStockMovementsLegacy(filters: { warehouseId?: number; productId?: number }, page: number, length: number): Promise<StockMovementsData> {
      const body = new URLSearchParams({ action: 'get_page_data', page: String(page), limit: String(length) })
      if (filters.warehouseId) body.set('id', String(filters.warehouseId))
      if (filters.productId) body.set('idproduct', String(filters.productId))
      const res = await fetch('/product/stock/ajax/movement_list_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawResponse = await res.json()
      if (!json.success) throw new Error(json.error || 'Request failed.')
      const d = json.data
      return {
        productHeader: d.product_header
          ? { id: d.product_header.id, ref: d.product_header.ref, label: d.product_header.label, totalStock: Number(d.product_header.total_stock), warehouseCount: d.product_header.warehouse_count }
          : null,
        warehouseHeader: d.warehouse_header
          ? {
              id: d.warehouse_header.id,
              ref: d.warehouse_header.ref,
              label: d.warehouse_header.label,
              nbDifferentProducts: d.warehouse_header.nb_different_products,
              nbProducts: d.warehouse_header.nb_products,
              stockValue: d.warehouse_header.stock_value,
              lastMovement: d.warehouse_header.last_movement,
            }
          : null,
        stats: {
          saleUseQty: d.stats_formatted.sale_use_qty,
          soldQty: d.stats_formatted.sold_qty,
          purchaseQty: d.stats_formatted.purchase_qty,
          lotUsedCount: d.stats_formatted.lot_used_count,
          correctionCount: d.stats_formatted.correction_count,
        },
        movements: d.movements.map((m) => ({
          id: Number(m.mid),
          productRef: m.product_ref,
          productLabel: m.produit,
          date: m.datem_formatted,
          warehouseRef: m.warehouse_ref,
          author: m.user_login,
          inventoryCode: m.inventorycode,
          label: m.label,
          typeLabel: m.type_label,
          qty: Number(m.qty),
          qtyDisplay: m.qty_display,
          costPrice: m.cost_price,
          batch: m.batch,
        })),
        total: Number(d.nbtotalofrecords),
      }
}

// product/stock/fapi/movements.php (key-authenticated JSON, header added 5 Nov 2026), default period = the current month, newest first.
// Checked live on newecuenta 5 Nov 2026 against the classic movement_list_api.php: the product header's total stock and the warehouse
// header's figures agree - different products = by_warehouse.products of product/stock/fapi/dashboard.php (6), products = its qty
// (-22), stock value = its value_at_cost (0.00, what the classic header prints), last movement = the newest movement of all dates
// (10/31/2026 06:41). Dates print in the browser's time zone, as the other stock pages do.
interface FapiMovementsPage extends FapiMovementList {
  header?: { product?: { id: number; ref: string; label: string; stock: number }; warehouse?: { id: number; ref: string; name: string; location: string } }
}
interface FapiWarehouseTotals {
  by_warehouse?: Array<{ id: number; products: number; qty: number; value_at_cost: number }>
  stock?: { currency?: string }
}

const mapMovement = (m: FapiMovement): StockMovementRow => ({
  id: m.id,
  productRef: m.product_ref,
  productLabel: m.product_label,
  date: formatDateTimeAmPm(m.date),
  warehouseRef: m.warehouse_ref,
  author: m.user_name || m.user_login,
  inventoryCode: m.inventory_code ?? '',
  label: m.label,
  typeLabel: m.type_label,
  qty: Number(m.qty),
  qtyDisplay: String(m.qty),
  costPrice: m.cost_price ? String(m.cost_price) : '',
  batch: m.batch ?? '',
})

async function fetchStockMovementsFapi(filters: { warehouseId?: number; productId?: number }, page: number, length: number): Promise<StockMovementsData> {
  const list = await fapiGet<FapiMovementsPage>('/product/stock/fapi/movements.php', { limit: length, page: page + 1, warehouse_id: filters.warehouseId, product_id: filters.productId })
  const h = list.header
  let warehouseHeader: StockMovementsData['warehouseHeader'] = null
  if (h?.warehouse) {
    const [totals, newest] = await Promise.all([
      fapiGet<FapiWarehouseTotals>('/product/stock/fapi/dashboard.php'),
      fapiGet<{ items?: FapiMovement[] }>('/product/stock/fapi/movements.php', { warehouse_id: h.warehouse.id, period: 'all', limit: 1 }),
    ])
    const w = totals.by_warehouse?.find((x) => x.id === h.warehouse!.id)
    warehouseHeader = {
      id: h.warehouse.id,
      ref: h.warehouse.ref,
      label: h.warehouse.name || h.warehouse.ref,
      nbDifferentProducts: w ? String(w.products) : '',
      nbProducts: w ? String(w.qty) : '',
      stockValue: w ? `${formatMoney(w.value_at_cost)} ${totals.stock?.currency ?? ''}`.trim() : '',
      lastMovement: newest.items?.[0] ? formatDateTimeAmPm(newest.items[0].date) : '',
    }
  }
  const st = list.stats
  return {
    productHeader: h?.product ? { id: h.product.id, ref: h.product.ref, label: h.product.label, totalStock: Number(h.product.stock), warehouseCount: null } : null,
    warehouseHeader,
    stats: {
      saleUseQty: String(st.sale_use_qty),
      soldQty: String(st.sold_qty),
      purchaseQty: String(st.purchase_qty),
      lotUsedCount: String(st.lot_used_count),
      correctionCount: String(st.correction_count),
    },
    movements: list.items.map(mapMovement),
    total: Number(list.pagination.total) || 0,
  }
}

export function useStockMovements(filters: { warehouseId?: number; productId?: number }, page: number, length: number) {
  return useQuery({
    queryKey: ['stockMovements', filters, page, length],
    queryFn: () => preferNewApi('stockMovementsPage', () => fetchStockMovementsFapi(filters, page, length), () => fetchStockMovementsLegacy(filters, page, length)),
    enabled: Boolean(filters.warehouseId || filters.productId),
  })
}
