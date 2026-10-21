/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// product/stock/fapi/minmax.php (16 Oct 2026): the min / max stock levels (llx_product.seuil_stock_alerte and
// desiredstock - per product, never per warehouse) with the status, the suggestions (average daily usage of the last 90
// days of manual movements x lead time x 1.5) and the KPI summary, plus the writes (update, bulk_update,
// apply_suggested, import). apply_suggested and import are dry runs unless confirm:true is sent; a minimum above the
// maximum is refused with 422. Replaces the minmax_stock.php page scrape and its CSRF-token form posts.

export type MinMaxStatusKey = 'ok' | 'out_of_stock' | 'below_min' | 'above_max'

export interface MinMaxStockRow {
  id: number
  ref: string
  label: string
  barcode: string | null
  status: MinMaxStatusKey
  statusLabel: string
  currentStock: number
  minStock: number
  maxStock: number
  suggestedMin: number
  suggestedMax: number
  avgDailyUsage: number
  leadTimeDays: number
  sellingPrice: number
  stockValue: number
}

export interface MinMaxStockStats {
  totalProducts: number
  withMin: number
  withMax: number
  coveragePct: number
  withNone: number
  statusCounts: Record<MinMaxStatusKey, number>
}

export interface MinMaxStockPageData {
  stats: MinMaxStockStats
  rows: MinMaxStockRow[]
}

export interface MinMaxStockFilters {
  search?: string
  filterStatus?: 'no_min' | 'has_min' | ''
}


const FAPI = '/product/stock/fapi/minmax.php'
const BADGE: Record<MinMaxStatusKey, string> = { ok: 'OK', out_of_stock: 'OUT', below_min: 'LOW', above_max: 'HIGH' }

// The class pages without a grand total, so pages are read until one comes back short.
async function fetchFromFapi(filters: MinMaxStockFilters): Promise<MinMaxStockPageData> {
  const limit = 200
  const items: any[] = []
  let summary: any = {}
  for (let page = 1; page <= 25; page += 1) {
    const d = await fapiGet<any>(FAPI, { page, limit, search: filters.search || undefined, no_min: filters.filterStatus === 'no_min' ? 1 : undefined, has_min: filters.filterStatus === 'has_min' ? 1 : undefined })
    summary = d.summary ?? summary
    items.push(...(d.items ?? []))
    if ((d.items ?? []).length < limit) break
  }
  const sc = summary.status_counts ?? {}
  return {
    stats: {
      totalProducts: Number(summary.total_products) || 0,
      withMin: Number(summary.with_min) || 0,
      withMax: Number(summary.with_max) || 0,
      coveragePct: Number(summary.coverage_pct) || 0,
      withNone: Number(summary.with_none) || 0,
      statusCounts: { ok: Number(sc.ok) || 0, out_of_stock: Number(sc.out_of_stock) || 0, below_min: Number(sc.below_min) || 0, above_max: Number(sc.above_max) || 0 },
    },
    rows: items.map((r): MinMaxStockRow => {
      const status = (r.status as MinMaxStatusKey) in BADGE ? (r.status as MinMaxStatusKey) : 'ok'
      return {
        id: Number(r.product_id),
        ref: r.product_ref ?? '',
        label: r.product_label ?? '',
        barcode: r.barcode || null,
        status,
        statusLabel: BADGE[status],
        currentStock: Number(r.current_stock) || 0,
        minStock: Number(r.min_stock) || 0,
        maxStock: Number(r.max_stock) || 0,
        suggestedMin: Number(r.suggested_min) || 0,
        suggestedMax: Number(r.suggested_max) || 0,
        avgDailyUsage: Number(r.avg_daily_usage) || 0,
        leadTimeDays: Number(r.lead_time_days) || 7,
        sellingPrice: Number(r.selling_price) || 0,
        stockValue: Number(r.stock_value) || 0,
      }
    }),
  }
}

export function useMinMaxStockPage(filters: MinMaxStockFilters) {
  return useQuery({
    queryKey: ['warehouses', 'minMaxStock', filters],
    queryFn: (): Promise<MinMaxStockPageData> => fetchFromFapi(filters),
    staleTime: 1000 * 30,
  })
}

export interface BulkStockUpdateEntry {
  productId: number
  minStock: number
  maxStock: number
}

// POST ?action=bulk_update {updates:[{product, min_stock, max_stock}]}: one result per row; rows the class refused come
// back in row_errors and are raised together.
export function useBulkUpdateMinMaxStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entries: BulkStockUpdateEntry[]) => {
      if (entries.length === 0) return
      const d = await fapiPost<any>(FAPI, { updates: entries.map((e) => ({ product: e.productId, min_stock: e.minStock, max_stock: e.maxStock })) }, { action: 'bulk_update' })
      const failed = (d.row_errors ?? []) as { product?: number; error?: string; message?: string }[]
      if (failed.length > 0) throw new Error(failed.map((f) => f.error ?? f.message ?? `product ${f.product} was refused`).join('; '))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'minMaxStock'] }),
  })
}

// POST ?action=apply_suggested {confirm:true}: sets the suggested minimum and maximum on every product that has no
// minimum yet (it overwrites the maximum too, because the class writes both together).
export function useApplySuggestedLevels() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fapiPost(FAPI, { confirm: true }, { action: 'apply_suggested' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'minMaxStock'] }),
  })
}

// A CSV with a product_ref column and min_stock / max_stock (either may be blank to keep the current value) is read
// in the browser and sent as ?action=import {rows:[{ref, min_stock, max_stock}], confirm:true}. The classic import also
// took a selling_price column; the endpoint has no price field, so a price column is ignored.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const endRow = () => {
    row.push(cell)
    rows.push(row)
    row = []
    cell = ''
  }
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',' || c === ';') {
      row.push(cell)
      cell = ''
    } else if (c === String.fromCharCode(10)) endRow()
    else if (c === String.fromCharCode(13)) {
      if (text[i + 1] === String.fromCharCode(10)) i += 1
      endRow()
    } else cell += c
  }
  if (cell !== '' || row.length > 0) endRow()
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

export function useImportMinMaxCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const table = parseCsv(await file.text())
      const header = (table[0] ?? []).map((h) => h.trim().toLowerCase())
      const col = (name: string) => header.indexOf(name)
      if (col('product_ref') < 0) throw new Error('The CSV needs a product_ref column.')
      const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? undefined : Number(v))
      const rows = table.slice(1).map((r) => ({ ref: r[col('product_ref')]?.trim(), min_stock: num(r[col('min_stock')]), max_stock: num(r[col('max_stock')]) })).filter((r) => r.ref)
      if (rows.length === 0) throw new Error('The CSV has no rows to import.')
      await fapiPost(FAPI, { rows, confirm: true }, { action: 'import' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'minMaxStock'] }),
  })
}
