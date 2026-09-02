import { useQuery } from '@tanstack/react-query'

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
  productHeader: { id: number; ref: string; label: string; totalStock: number; warehouseCount: number } | null
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

// Real via product/stock/ajax/movement_list_api.php — the JSON backend for
// product/stock/movement_list.php, which is itself a genuine custom-built
// SPA shell for this instance (confirmed by its own "This file renders only
// a minimal shell" comment), not a stock stub scraper. Real
// hasRight('stock','mouvement','lire') check. Only the read action
// (get_page_data) is wired here — the API also exposes correct_stock/
// transfer_stock/mass_action mutations, left unwired (frontend-only scope
// plus this session's rule to never live-test mutations without explicit
// per-instance approval).
export function useStockMovements(filters: { warehouseId?: number; productId?: number }, page: number, length: number) {
  return useQuery({
    queryKey: ['stockMovements', filters, page, length],
    queryFn: async (): Promise<StockMovementsData> => {
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
    },
    enabled: Boolean(filters.warehouseId || filters.productId),
  })
}
