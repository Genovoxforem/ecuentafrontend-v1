import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addVariantAttributeValue,
  createProductLot,
  createVariantAttribute,
  deleteProductLot,
  deleteVariantAttribute,
  deleteVariantAttributeValue,
  getBulkPriceInfo,
  getBulkVatInfo,
  getGlobalProductStats,
  getProductLot,
  getStockAtDate,
  getVariantAttribute,
  listProductLots,
  listStockByLot,
  listStockReplenishment,
  listVariantAttributes,
  moveVariantAttribute,
  runBulkPrice,
  runBulkVat,
  updateProductLot,
  updateVariantAttribute,
  updateVariantAttributeValue,
  type BulkPriceInput,
  type BulkVatInput,
  type GlobalStatsData,
  type ProductLotInput,
  type ProductLotItem,
  type ReassortItem,
  type ReassortLotItem,
  type StockAtDateParams,
  type UnixTime,
} from '../../api/products'
import { loadRemainingPages } from '../../api/paging'
import { formatDate } from '../../utils/format'
import type { ProductStatSeries, StockByLotRow } from './productTypes'

// The stock views, lots, variant attributes, all-products statistics and the two
// bulk tools — product/stock/fapi, variants/fapi and product/fapi. A backend
// without those files answers an HTML 404, and the pages that have a classic page
// fall back to scraping it (productLegacyParsers.ts). Stock at a date, the lot /
// attribute writes and the bulk tools have no classic source, so they have no
// fallback.

/** Unix seconds → YYYY-MM-DD ('' when unset). Strings pass through as-is. */
export function unixDate(value: UnixTime | string | undefined): string {
  if (value === null || value === undefined || value === '' || value === 0) return ''
  if (typeof value === 'string') return /^\d+$/.test(value) ? formatDate(Number(value) * 1000) : value
  return formatDate(value * 1000)
}

function saleLabel(flag: number | boolean, kind: 'sale' | 'purchase'): string {
  return flag ? `For ${kind}` : `Not for ${kind}`
}

// ── Stocks and location (product/stock/fapi/reassort.php) ──────

export interface StockListRow {
  id: string | null
  ref: string
  label: string
  barcode: string
  stockLimit: number
  desiredStock: number
  physical: number
  /** null when the backend left virtual stock out. */
  virtual: number | null
  /** Stock value at the weighted average cost; not on the classic page. */
  value: number | null
  toOrder: number | null
  belowAlert: boolean
  batchEnabled: boolean | null
  forSale: string
  forPurchase: string
  /** ZRA sync state as the classic card prints it, e.g. "ZRA Not Synced"; '' when unknown. */
  zra: string
  avatarBg: string | null
  avatarColor: string | null
}

export interface StockListFilters {
  search: string
  warehouse: number
  categ: number
  lowStock: boolean
  page: number
  limit: number
}

export function stockRowFromApi(item: ReassortItem): StockListRow {
  return {
    id: String(item.id),
    ref: item.ref,
    label: item.label,
    barcode: item.barcode ?? '',
    stockLimit: item.stock_limit ?? 0,
    desiredStock: item.desired_stock ?? 0,
    physical: item.stock_physique ?? 0,
    virtual: item.stock_virtual ?? null,
    value: item.stock_value ?? null,
    toOrder: item.to_order ?? null,
    belowAlert: !!item.below_alert,
    batchEnabled: item.batch_enabled ?? null,
    forSale: saleLabel(item.to_sell, 'sale'),
    forPurchase: saleLabel(item.to_buy, 'purchase'),
    zra: item.zra?.status ? `ZRA ${item.zra.status}` : item.zra ? 'ZRA Not Synced' : '',
    avatarBg: null,
    avatarColor: null,
  }
}

export function useStockList(filters: StockListFilters) {
  return useQuery({
    queryKey: ['products', 'tools', 'stockList', filters],
    queryFn: () =>
      (async () => {
          const d = await listStockReplenishment({
            page: filters.page,
            limit: filters.limit,
            search_all: filters.search.trim() || undefined,
            warehouse: filters.warehouse || undefined,
            categ: filters.categ || undefined,
            toolowstock: filters.lowStock ? 1 : undefined,
          })
          return {
            rows: d.items.map(stockRowFromApi),
            total: d.pagination.total,
            pages: Math.max(1, d.pagination.pages),
            totals: { units: d.totals.page_stock_units, value: d.totals.page_stock_value, belowAlert: d.totals.page_below_alert, toOrder: d.totals.page_to_order },
            source: 'api',
            rowsWithoutStockShown: !!d.filters?.rows_without_stock_shown,
          }
        })(),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// ── Stocks by lot/serial (product/stock/fapi/reassort_lot.php) ──
// One row per product + warehouse + lot. Read whole (lot-tracked stock is small)
// because the FEFO dashboard orders and buckets every lot client-side.

export function lotStockRowFromApi(item: ReassortLotItem): StockByLotRow {
  return {
    productId: String(item.product.id),
    ref: item.product.ref,
    label: item.product.label,
    cardUrl: null,
    warehouse: item.warehouse?.ref ?? '',
    lotSerial: item.batch,
    eatByDate: unixDate(item.eatby),
    sellByDate: unixDate(item.sellby),
    physicalStock: item.stock_physique ?? 0,
    movementsUrl: null,
    forSale: saleLabel(item.product.to_sell, 'sale'),
    forPurchase: saleLabel(item.product.to_buy, 'purchase'),
    avatarBg: null,
    avatarColor: null,
  }
}

export function useStockByLotRows() {
  return useQuery({
    queryKey: ['products', 'tools', 'stockByLot'],
    queryFn: () =>
      (async () => {
          const first = await listStockByLot({ page: 1, limit: 500 })
          const rest = await loadRemainingPages(first.pagination.pages, async (page) => (await listStockByLot({ page, limit: 500 })).items)
          return first.items.concat(...rest).map(lotStockRowFromApi)
        })(),
    staleTime: 1000 * 30,
    retry: false,
  })
}

// ── Stock at a date (product/stock/fapi/stock_at_date.php) ─────
// New: the classic page loaded nothing, so there is no fallback.

export function useStockAtDate(params: StockAtDateParams | null) {
  return useQuery({
    queryKey: ['products', 'tools', 'stockAtDate', params],
    queryFn: () => getStockAtDate(params!),
    enabled: !!params?.date,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// ── Lots / serials (product/stock/fapi/lots.php) ───────────────

export interface LotRow {
  id: string | null
  batch: string
  productId: string | null
  productRef: string
  productLabel: string
  eatBy: string
  sellBy: string
  created: string
  stockQty: number | null
  expired: boolean | null
}

export interface LotListFilters {
  batch: string
  expired: boolean
  page: number
  limit: number
}

// The list item shape was never captured live (newecuenta has no lot-tracked
// product), so the product may come nested or flat.
export function lotRowFromApi(item: ProductLotItem): LotRow {
  const product = typeof item.product === 'object' && item.product !== null ? item.product : null
  const productId = product?.id ?? (typeof item.product === 'number' ? item.product : item.fk_product)
  const qty = item.stock_qty ?? item.qty ?? item.stock?.total_qty
  return {
    id: item.id ? String(item.id) : null,
    batch: item.batch ?? '',
    productId: productId ? String(productId) : null,
    productRef: product?.ref ?? item.product_ref ?? '',
    productLabel: product?.label ?? item.product_label ?? '',
    eatBy: unixDate(item.eatby),
    sellBy: unixDate(item.sellby),
    created: unixDate(item.datec),
    stockQty: typeof qty === 'number' ? qty : null,
    expired: typeof item.expired === 'boolean' ? item.expired : null,
  }
}

export function useLotList(filters: LotListFilters) {
  return useQuery({
    queryKey: ['products', 'tools', 'lots', filters],
    queryFn: () =>
      (async () => {
          const d = await listProductLots({ page: filters.page, limit: filters.limit, batch: filters.batch.trim() || undefined, expired: filters.expired ? 1 : undefined })
          return {
            rows: d.items.map(lotRowFromApi),
            total: d.pagination.total,
            pages: Math.max(1, d.pagination.pages),
            totals: { stockQty: d.totals.page_stock_qty, expired: d.totals.page_expired },
            canCreate: d.can_create,
            canDelete: d.can_delete,
            source: 'api',
          }
        })(),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useLot(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'tools', 'lot', id],
    queryFn: () => getProductLot(id!),
    enabled: !!id,
    retry: false,
  })
}

function useLotInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['products', 'tools', 'lots'] })
    void queryClient.invalidateQueries({ queryKey: ['products', 'tools', 'lot'] })
    void queryClient.invalidateQueries({ queryKey: ['products', 'tools', 'stockByLot'] })
  }
}

export function useCreateLot() {
  const invalidate = useLotInvalidate()
  return useMutation({ mutationFn: (input: ProductLotInput) => createProductLot(input), onSuccess: invalidate })
}

export function useUpdateLot() {
  const invalidate = useLotInvalidate()
  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Partial<Omit<ProductLotInput, 'product'>> }) => updateProductLot(id, fields),
    onSuccess: invalidate,
  })
}

export function useDeleteLot() {
  const invalidate = useLotInvalidate()
  return useMutation({ mutationFn: ({ id, confirm }: { id: number; confirm: boolean }) => deleteProductLot(id, confirm), onSuccess: invalidate })
}

// ── Variant attributes (variants/fapi/attributes.php) ──────────

export interface AttributeRow {
  id: string | null
  ref: string
  label: string
  position: number | null
  valueCount: number
  productCount: number
  /** null on the classic list, which does not say. */
  isUsed: boolean | null
}

export function useVariantAttributeList() {
  return useQuery({
    queryKey: ['products', 'tools', 'attributes'],
    queryFn: () =>
      (async () => {
          const d = await listVariantAttributes()
          const rows = d.items.map(
            (a): AttributeRow => ({ id: String(a.id), ref: a.ref, label: a.label, position: a.position ?? null, valueCount: a.value_count ?? 0, productCount: a.product_count ?? 0, isUsed: !!a.is_used }),
          )
          return { rows, canCreate: d.can_create, source: 'api' }
        })(),
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useVariantAttribute(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'tools', 'attribute', id],
    queryFn: () => getVariantAttribute(id!),
    enabled: !!id,
    retry: false,
  })
}

function useAttributeInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['products', 'tools', 'attributes'] })
    void queryClient.invalidateQueries({ queryKey: ['products', 'tools', 'attribute'] })
  }
}

export type AttributeAction =
  | { action: 'create'; ref: string; label: string }
  | { action: 'update'; id: number; ref: string; label: string }
  | { action: 'delete'; id: number }
  | { action: 'add_value'; id: number; ref: string; value: string }
  | { action: 'update_value'; id: number; valueId: number; ref: string; value: string }
  | { action: 'delete_value'; id: number; valueId: number }
  | { action: 'move'; id: number; direction: 'up' | 'down' }

export function runAttributeAction(a: AttributeAction): Promise<unknown> {
  switch (a.action) {
    case 'create':
      return createVariantAttribute({ ref: a.ref, label: a.label })
    case 'update':
      return updateVariantAttribute(a.id, { ref: a.ref, label: a.label })
    case 'delete':
      return deleteVariantAttribute(a.id)
    case 'add_value':
      return addVariantAttributeValue(a.id, { ref: a.ref, value: a.value })
    case 'update_value':
      return updateVariantAttributeValue(a.id, a.valueId, { ref: a.ref, value: a.value })
    case 'delete_value':
      return deleteVariantAttributeValue(a.id, a.valueId)
    case 'move':
      return moveVariantAttribute(a.id, a.direction)
  }
}

export function useAttributeAction() {
  const invalidate = useAttributeInvalidate()
  return useMutation({ mutationFn: runAttributeAction, onSuccess: invalidate })
}

// ── All-products statistics (product/fapi/global_stats.php) ────

export interface ProductStatsFilters {
  mode: 'byunit' | 'bynumber'
  /** 0 = the twelve months ending this one. */
  year: number
  categoryId: number
}

export interface ProductStatsView {
  series: ProductStatSeries[]
  /** One label per point, e.g. "Nov 25" (null: the classic page's Jan–Dec). */
  labels: string[] | null
  periodLabel: string
  /** How many products/services the figures cover (null on the classic page). */
  covers: number | null
  /** Series left out because the module is off or the right is missing — not zeros. */
  skipped: string[]
  source: 'api' | 'legacy'
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2025-11" → "Nov 25"; just "Nov" when every period is in the same year. */
export function periodLabels(periods: string[]): string[] {
  const years = new Set(periods.map((p) => p.slice(0, 4)))
  return periods.map((p) => {
    const month = MONTH_SHORT[Number(p.slice(5, 7)) - 1] ?? p
    return years.size > 1 ? `${month} ${p.slice(2, 4)}` : month
  })
}

export function statsViewFromApi(d: GlobalStatsData): ProductStatsView {
  const series = Object.values(d.series ?? {}).map((s): ProductStatSeries => ({ label: s.label, total: s.total, monthly: s.points.map((p) => p.value) }))
  const skipped = (d.skipped ?? []).map((s) => (typeof s === 'string' ? s : [s.series ?? s.key, s.reason].filter(Boolean).join(': ')))
  return { series, labels: periodLabels(d.periods ?? []), periodLabel: d.year_label, covers: d.covers ?? null, skipped, source: 'api' }
}

export function useProductStatistics(type: 0 | 1, filters: ProductStatsFilters) {
  return useQuery({
    queryKey: ['products', 'tools', 'stats', type, filters],
    queryFn: () =>
      (async () => statsViewFromApi(await getGlobalProductStats({ type, mode: filters.mode, year: filters.year || undefined, categ: filters.categoryId || undefined })))(),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// ── Bulk VAT / price (product/fapi/bulk_vat.php, bulk_price.php) ──
// A run without confirm is a dry run; only a confirmed run changes prices, so
// only that one invalidates the product queries.

export function useBulkVatInfo() {
  return useQuery({ queryKey: ['products', 'tools', 'bulkVat'], queryFn: getBulkVatInfo, staleTime: 1000 * 60 * 5, retry: false })
}

export function useBulkPriceInfo() {
  return useQuery({ queryKey: ['products', 'tools', 'bulkPrice'], queryFn: getBulkPriceInfo, staleTime: 1000 * 60 * 5, retry: false })
}

export function useRunBulkVat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, confirm }: { input: BulkVatInput; confirm: boolean }) => runBulkVat(input, confirm),
    onSuccess: (_d, { confirm }) => {
      if (confirm) void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useRunBulkPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, confirm }: { input: BulkPriceInput; confirm: boolean }) => runBulkPrice(input, confirm),
    onSuccess: (_d, { confirm }) => {
      if (confirm) void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export type StockBucket = 'out' | 'low' | 'in' | 'over'

/** The classic Stocks board's four columns: nothing left, under the alert level, healthy, above the desired stock. */
export function stockBucket(row: Pick<StockListRow, 'physical' | 'stockLimit' | 'desiredStock'>): StockBucket {
  if (row.physical <= 0) return 'out'
  if (row.stockLimit > 0 && row.physical < row.stockLimit) return 'low'
  if (row.desiredStock > 0 && row.physical > row.desiredStock) return 'over'
  return 'in'
}

