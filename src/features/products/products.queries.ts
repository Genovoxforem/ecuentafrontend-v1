import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { fetchAllProductsRich, type RichProductRow } from './productAjax'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import {
  parseProductStocks,
  parseProductStocksByLot,
  parseLotSerials,
  parseVariantAttributes,
  parseProductStats,
  looksLikeLegacyLoginPage,
  type StockLocationRow,
  type StockByLotRow,
  type LotSerialRow,
  type VariantAttributeRow,
  type ProductStatSeries,
} from './productLegacyParsers'

export interface ProductRow {
  id: string
  ref: string
  label: string
  priceExclTax: number
  priceInclTax: number
  vatRate: string
  stock: number
  type: 'product' | 'service'
  barcode: string
  // Real `tosell` field, confirmed present on every row from this
  // endpoint. There's no matching `tobuy` field in this API's response
  // (checked live) — see ProductArea.tsx's DashboardTab for how that's
  // handled honestly (for-sale split only, not the legacy page's full
  // for-sale/for-purchase/neither breakdown).
  forSale: boolean
}

export interface ProductsSummary {
  totalProducts: number
  totalServices: number
  currency: string
  products: ProductRow[]
}

export interface ServicesSummary {
  totalServices: number
  currency: string
  services: ProductRow[]
}

// GET /api/products/ response shape, confirmed live.
interface RawProduct {
  id: number | string
  ref: string
  label: string
  price: number | string
  price_ttc: number | string
  tva_tx: string
  fk_product_type: number
  stock: number | string
  barcode: string
  tosell?: number
}

interface ProductsResponse {
  success: boolean
  products: RawProduct[]
  total_count: number
  currency: string
}

export function toRow(raw: RawProduct): ProductRow {
  return {
    id: String(raw.id ?? ''),
    ref: raw.ref ?? '',
    label: raw.label ?? '',
    priceExclTax: Number(raw.price ?? 0),
    priceInclTax: Number(raw.price_ttc ?? 0),
    vatRate: raw.tva_tx ?? '',
    stock: Number(raw.stock ?? 0),
    // fk_product_type: 0 = product, 1 = service (standard Dolibarr convention).
    type: raw.fk_product_type === 1 ? 'service' : 'product',
    barcode: raw.barcode ?? '',
    forSale: raw.tosell === 1,
  }
}

// GET /api/products/ — confirmed live on this app's backend. Products and
// services share this one endpoint (fk_product_type distinguishes them),
// so both hooks below query the same cache key and split client-side
// rather than each making their own request.
export function useProductRows() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const { data } = await api.get<ProductsResponse>('/products/', { params: { limit: 250 } })
      return { rows: (data.products ?? []).map(toRow), currency: data.currency ?? 'ZMW' }
    },
    staleTime: 1000 * 60,
  })
}

export function useProductsSummary() {
  const { data, ...rest } = useProductRows()
  const summary: ProductsSummary | undefined = data && {
    totalProducts: data.rows.filter((r) => r.type === 'product').length,
    totalServices: data.rows.filter((r) => r.type === 'service').length,
    currency: data.currency,
    products: data.rows.filter((r) => r.type === 'product'),
  }
  return { data: summary, ...rest }
}

// Trimmed-down view of the same data, for <select> pickers on create forms.
export function useProductOptions() {
  const { data, ...rest } = useProductRows()
  return { data: data?.rows, ...rest }
}

// GET /api/products/?action=list&search= — same real endpoint as above, but
// server-side filtered for search-as-you-type use (see ZRA Split Details'
// product picker) instead of fetching the whole catalog client-side.
export interface ProductSearchResult {
  id: string
  ref: string
  label: string
}
export function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: async (): Promise<ProductSearchResult[]> => {
      const { data } = await api.get<ProductsResponse>('/products/', { params: { action: 'list', search: query, limit: 20 } })
      return (data.products ?? []).map((p) => ({ id: String(p.id ?? ''), ref: p.ref ?? '', label: p.label ?? '' }))
    },
    enabled: query.trim().length > 1,
    staleTime: 1000 * 30,
  })
}

// The "All Products" report (product/allproducts.php) shows several columns
// /api/products/ doesn't have (Category, Desired/Reserved/Physical stock
// breakdown, ZRA status, Classification, Country, Lot status) — these have
// no REST equivalent, so this replays Dolibarr's own DataTables AJAX
// endpoint directly (see productAjax.ts). Best-effort: ProductsList.tsx
// falls back to "—" per-cell if this fails rather than blocking the page,
// same pattern as useWarehouseLegacyStats.
export function useAllProductsRich(type: 0 | 1) {
  return useQuery({
    queryKey: ['products', 'ajaxRich', type],
    queryFn: () => fetchAllProductsRich(type),
    staleTime: 1000 * 30,
    retry: false,
  })
}
export type { RichProductRow }

// Shared shape for the five report pages below (Stocks, Stocks By Lot,
// Lots/Serials, Variant Attributes, Statistics) — none have a REST
// equivalent, so all of them scrape the real legacy page client-side, same
// approach as useWarehouseLegacyStats/useLedgerReport. See
// productLegacyParsers.ts for how each page's markup was verified.
function useLegacyProductReport<T>(queryKey: unknown[], path: string, parse: (doc: Document) => T, params?: URLSearchParams) {
  return useQuery({
    queryKey: ['products', 'legacy', ...queryKey],
    queryFn: async (): Promise<T> => {
      const doc = await fetchLegacyDocument(path, params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parse(doc)
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useProductStocksReport() {
  return useLegacyProductReport<StockLocationRow[]>(['stocks'], '/product/reassort.php', parseProductStocks, new URLSearchParams({ type: '0' }))
}

export function useProductStocksByLotReport() {
  return useLegacyProductReport<StockByLotRow[]>(['stocksByLot'], '/product/reassortlot.php', parseProductStocksByLot, new URLSearchParams({ type: '0' }))
}

export function useLotSerialsReport() {
  return useLegacyProductReport<LotSerialRow[]>(['lotSerials'], '/product/stock/productlot_list.php', parseLotSerials)
}

export function useVariantAttributesReport() {
  return useLegacyProductReport<VariantAttributeRow[]>(['variantAttributes'], '/variants/list.php', parseVariantAttributes)
}

// type: 0 = Products, 1 = Services — the legacy report itself splits on
// this (confirmed live: Products and Services return genuinely different
// numbers), matching fk_product_type's convention everywhere else here.
export function useProductStatsReport(type: 0 | 1) {
  return useLegacyProductReport<ProductStatSeries[]>(['stats', type], '/product/stats/card.php', parseProductStats, new URLSearchParams({ id: 'all', type: String(type) }))
}

export function useServicesSummary() {
  const { data, ...rest } = useProductRows()
  const summary: ServicesSummary | undefined = data && {
    totalServices: data.rows.filter((r) => r.type === 'service').length,
    currency: data.currency,
    services: data.rows.filter((r) => r.type === 'service'),
  }
  return { data: summary, ...rest }
}
