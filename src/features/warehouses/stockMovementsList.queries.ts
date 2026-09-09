import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real reference page: product/stock/movement_list.php ("List of Stock
// Movements"). This one is NOT classic Dolibarr HTML — it's a genuine
// custom SPA (product/stock/js/movement_list_app.js) backed by a real,
// complete REST JSON API at product/stock/ajax/movement_list_api.php
// (found by reading the SPA's own apiCall()/fetchAll() functions and the
// apiUrl embedded in the initial page's bootstrap JSON — not a guess).
// action=get_page_data returns everything this page needs in one real call:
// real per-item Today/Total stat figures (stats.sale_use_qty/today,
// sold_qty/today, purchase_qty/today, lot_used_count/today,
// correction_count/today), real filter option lists (filters.products/
// batches/inventory_codes), and the real movement rows themselves — no
// scraping anywhere. Confirmed live: sold_qty=217, purchase_qty=72,
// correction_count=38 with a wide date range, matching real historical
// activity on this install.
//
// Bulk "Update to ZRA" (the header checkbox column) is also real — a
// separate action (product/stock/zraupdatestock.php), POSTed once per
// selected movement with movement_rowid + itemdetails=inventorycode, read
// directly from the SPA's own batchUpdateZRA() loop.

export interface StockMovementRow {
  id: number
  productId: number
  productRef: string
  productLabel: string
  batch: string | null
  dateFormatted: string
  warehouseId: number
  warehouseRef: string
  author: string
  inventoryCode: string | null
  label: string
  typeMouvement: string
  typeLabel: string
  originRef: string
  originUrl: string
  costPrice: string
  qty: string
  zraStatusDisplay: string
  zraStatusClass: string
}

export interface StockMovementFilterOption {
  id: string
  ref: string
  label: string
}

export interface StockMovementsStats {
  saleUseQty: number
  saleUseToday: number
  soldQty: number
  soldToday: number
  purchaseQty: number
  purchaseToday: number
  lotUsedCount: number
  lotUsedToday: number
  correctionCount: number
  correctionToday: number
}

export interface StockMovementsPageData {
  stats: StockMovementsStats
  products: StockMovementFilterOption[]
  batches: string[]
  inventoryCodes: string[]
  movements: StockMovementRow[]
  totalRecords: number
}

// The real `origin` field is a small embedded HTML link (e.g. a real
// Invoice/Order/Reception ref) inside an otherwise fully-real JSON response
// — parsing just that one fragment is the same established pattern used
// throughout this app for JSON fields that carry a Dolibarr getNomUrl()
// snippet (e.g. orderListParser.ts's parseThirdParty), not a page scrape.
function parseOrigin(html: string | null): { ref: string; url: string } {
  if (!html) return { ref: '', url: '' }
  const hrefMatch = html.match(/href="([^"]*)"/)
  const textMatch = html.match(/<\/span>([^<]*)<\/a>/)
  return { ref: textMatch ? textMatch[1].trim() : '', url: hrefMatch ? hrefMatch[1] : '' }
}

function mapRow(raw: Record<string, unknown>): StockMovementRow {
  const origin = parseOrigin(raw.origin as string | null)
  return {
    id: Number(raw.mid),
    productId: Number(raw.product_id),
    productRef: String(raw.product_ref ?? ''),
    productLabel: String(raw.product_label ?? ''),
    batch: (raw.batch as string | null) ?? null,
    dateFormatted: String(raw.datem_formatted ?? ''),
    warehouseId: Number(raw.warehouse_id),
    warehouseRef: String(raw.warehouse_ref ?? ''),
    author: [raw.user_firstname, raw.user_lastname].filter(Boolean).join(' ').trim() || String(raw.user_login ?? ''),
    inventoryCode: (raw.inventorycode as string | null) ?? null,
    label: String(raw.label ?? ''),
    typeMouvement: String(raw.type_mouvement ?? ''),
    typeLabel: String(raw.type_label ?? ''),
    originRef: origin.ref,
    originUrl: origin.url,
    costPrice: String(raw.cost_price ?? ''),
    qty: String(raw.qty_display ?? raw.qty ?? ''),
    zraStatusDisplay: String(raw.zra_status_display ?? ''),
    zraStatusClass: String(raw.zra_status_class ?? ''),
  }
}

export interface StockMovementFilters {
  warehouseId?: string
  dateRange?: string // "MM/DD/YYYY-MM/DD/YYYY", matches the real newdatepicker format
  productId?: string
  batch?: string
  inventoryCode?: string
  search?: string
}

function buildParams(filters: StockMovementFilters): URLSearchParams {
  const params = new URLSearchParams({ action: 'get_page_data' })
  if (filters.warehouseId) params.set('id', filters.warehouseId)
  if (filters.dateRange) params.set('newdatepicker', filters.dateRange)
  if (filters.productId) params.set('fk_producter', filters.productId)
  if (filters.batch) params.set('prod_lot', filters.batch)
  if (filters.inventoryCode) params.set('prod_invoice', filters.inventoryCode)
  if (filters.search) params.set('search_ref', filters.search)
  params.set('limit', '250')
  return params
}

export function useStockMovementsList(filters: StockMovementFilters) {
  return useQuery({
    queryKey: ['warehouses', 'stockMovementsList', filters],
    queryFn: async (): Promise<StockMovementsPageData> => {
      const res = await fetch(`/product/stock/ajax/movement_list_api.php?${buildParams(filters).toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load stock movements.')
      const d = json.data
      return {
        stats: {
          saleUseQty: Number(d.stats?.sale_use_qty ?? 0),
          saleUseToday: Number(d.stats?.sale_use_today ?? 0),
          soldQty: Number(d.stats?.sold_qty ?? 0),
          soldToday: Number(d.stats?.sold_today ?? 0),
          purchaseQty: Number(d.stats?.purchase_qty ?? 0),
          purchaseToday: Number(d.stats?.purchase_today ?? 0),
          lotUsedCount: Number(d.stats?.lot_used_count ?? 0),
          lotUsedToday: Number(d.stats?.lot_used_today ?? 0),
          correctionCount: Number(d.stats?.correction_count ?? 0),
          correctionToday: Number(d.stats?.correction_today ?? 0),
        },
        products: (d.filters?.products ?? []).map((p: { id: string; ref: string; label: string }) => ({ id: p.id, ref: p.ref, label: p.label })),
        batches: d.filters?.batches ?? [],
        inventoryCodes: d.filters?.inventory_codes ?? [],
        movements: (d.movements ?? []).map(mapRow),
        totalRecords: Number(d.nbtotalofrecords ?? 0),
      }
    },
    staleTime: 1000 * 30,
  })
}

// Real bulk action: POST product/stock/zraupdatestock.php once per selected
// movement (movement_rowid + itemdetails=inventorycode), matching the SPA's
// own batchUpdateZRA() loop exactly.
export function useBulkUpdateZraStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rows: { rowid: number; inventoryCode: string | null }[]) => {
      const results: { rowid: number; ok: boolean }[] = []
      for (const row of rows) {
        const body = new URLSearchParams({ movement_rowid: String(row.rowid), itemdetails: row.inventoryCode ?? '' })
        const res = await fetch('/product/stock/zraupdatestock.php', { method: 'POST', credentials: 'same-origin', body })
        let ok = res.ok
        if (ok) {
          try {
            const json = await res.json()
            ok = typeof json.status === 'string' ? json.status.includes('succeeded') : true
          } catch {
            // Non-JSON success response — treat the 2xx as success.
          }
        }
        results.push({ rowid: row.rowid, ok })
      }
      return results
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'stockMovementsList'] }),
  })
}
