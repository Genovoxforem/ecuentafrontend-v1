import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../api/axios'
import { BACKEND_ACTION_UNAVAILABLE_PREFIX } from '../../shared/components/BackendUnavailable'
import { fetchAllProductsRich, type RichProductRow } from './productAjax'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import {
  parseProductStocks,
  parseProductStocksByLot,
  parseLotSerials,
  parseVariantAttributes,
  parseProductStats,
  parseProductDetailPanel,
  parseProductCardMeta,
  parseEditWizardForm,
  looksLikeLegacyLoginPage,
  type StockLocationRow,
  type StockByLotRow,
  type LotSerialRow,
  type VariantAttributeRow,
  type ProductStatSeries,
  type ProductDetailPanel,
  type ProductDocumentRow,
  type EditWizardFormData,
} from './productLegacyParsers'

export interface ProductRow {
  id: string
  ref: string
  label: string
  priceExclTax: number
  priceInclTax: number
  // Display-only, e.g. "16 (A)" — the raw tva_tx field, rate plus Dolibarr
  // VAT code suffix. Not safe to Number() for math (yields NaN) — use
  // vatRatePct for that.
  vatRate: string
  // Clean numeric rate for calculations (e.g. 16), from the API's separate
  // tva_rate field — confirmed live to omit the " (A)" code suffix that
  // tva_tx carries, unlike vatRate above.
  vatRatePct: number
  // Clean VAT code alone (e.g. "A"), from the API's vat_src_code field —
  // pair with vatRatePct to build a "16%(A)" display without parsing
  // vatRate's compound string.
  vatCode: string
  // Real `cost_price` column (llx_product.cost_price) — the reference
  // layout's own product search / line-entry auto-fills this from the
  // selected product exactly the same way.
  costPrice: number
  stock: number
  type: 'product' | 'service'
  barcode: string
  // Real `itemclassification` column (a ZRA/UNSPSC-style product
  // classification code) — shown in the reference layout's own product
  // search dropdown as "Classification: 10101501".
  classification: string
  // Real `price_base_type` column ('HT' = price is excl. tax, 'TTC' =
  // price is incl. tax) — the reference layout's product search shows
  // "Price: X Excl. tax" or "Price: X Inc. tax" depending on this, not a
  // fixed label.
  priceBaseType: 'HT' | 'TTC'
  // Real `tosell` field, confirmed present on every row from this endpoint.
  forSale: boolean
  // Real `tobuy` field (added alongside finished/rrp below for the All
  // Products filter port — see productFilters.ts).
  forPurchase: boolean
  // Real `finished` column (Dolibarr's "Nature of product" — 1=Raw
  // Material, 2=Finished Product, 3=Service; see productConstants.ts's
  // NATURE_OPTIONS, confirmed against live DB to be the complete set of
  // distinct values actually used).
  finished: number
  // Real `rrp` column (Recommended Retail Price) — 0 when unset, same as
  // every other numeric field here.
  rrp: number
  // Real `image_url`/`has_image` — already returned by the backend's
  // buildProductRow() for every list/detail response, just not previously
  // mapped on the frontend. Root-relative path; resolve with
  // resolveBackendAsset() before use in an <img src>.
  imageUrl: string
  hasImage: boolean
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
  tva_rate?: number | string
  vat_src_code?: string
  fk_product_type: number
  stock: number | string
  barcode: string
  tosell?: number
  itemclassification?: string
  price_base_type?: string
  cost_price?: number | string
  finished?: number | string
  tobuy?: number
  rrp?: number | string
  image_url?: string
  has_image?: number
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
    vatRatePct: Number(raw.tva_rate ?? 0) || 0,
    vatCode: raw.vat_src_code ?? '',
    costPrice: Number(raw.cost_price ?? 0) || 0,
    stock: Number(raw.stock ?? 0),
    // fk_product_type: 0 = product, 1 = service (standard Dolibarr convention).
    type: raw.fk_product_type === 1 ? 'service' : 'product',
    barcode: raw.barcode ?? '',
    forSale: raw.tosell === 1,
    forPurchase: raw.tobuy === 1,
    finished: Number(raw.finished ?? 0) || 0,
    rrp: Number(raw.rrp ?? 0) || 0,
    classification: raw.itemclassification ?? '',
    priceBaseType: raw.price_base_type === 'TTC' ? 'TTC' : 'HT',
    imageUrl: raw.image_url ?? '',
    hasImage: raw.has_image === 1,
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
// id: 'all' (default, for the catalog-wide Statistics report page) or a
// specific product's id (for the Product Detail page's own Statistics tab
// — same underlying page, product/stats/card.php, just scoped differently).
export function useProductStatsReport(type: 0 | 1, id: string = 'all') {
  return useLegacyProductReport<ProductStatSeries[]>(['stats', type, id], '/product/stats/card.php', parseProductStats, new URLSearchParams({ id, type: String(type) }))
}

// Row-click detail panel (product/load_product_image.php) — see
// ProductsList.tsx's expandedId state. Written directly (not through
// useLegacyProductReport) since it needs a per-call `enabled` gate the
// shared helper doesn't expose. GETPOST('id') on the legacy side accepts
// GET query params fine, so this reuses fetchLegacyDocument like every
// other report here rather than needing a POST-capable fetch helper.
export function useProductDetailPanel(id: string | null) {
  return useQuery({
    queryKey: ['products', 'legacy', 'detailPanel', id],
    queryFn: async (): Promise<ProductDetailPanel> => {
      const doc = await fetchLegacyDocument('/product/load_product_image.php', new URLSearchParams({ id: id! }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseProductDetailPanel(doc)
    },
    enabled: !!id,
    staleTime: 1000 * 30,
    retry: false,
  })
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

// =============================================================================
// Product Detail page (mirrors legacy product/card.php's tab set) — see
// ProductDetail.tsx. Card/Stock/Statistics reuse hooks already defined
// above; everything below is new for the remaining tabs.

// GET /api/products/?action=detail&id=X — already-existing real endpoint
// (handleProductDetail() in api/products/index.php), just not previously
// wired to any React hook. Full field set for the Card tab, plus
// categories/note_public/note_private for their own tabs.
export interface ProductDetail extends ProductRow {
  description: string
  vatRate: string
  categories: { id: number; label: string }[]
  notePublic: string
  notePrivate: string
  currency: string
  // "About" section fields (product/card.php) — all confirmed live against
  // a real product (id=123, matching the reference screenshots exactly:
  // zraid/zrastatus/accountancy codes/base+packing units/barcode
  // type/manufacturer/total sold all cross-checked field-by-field).
  zraId: string
  zraStatus: string
  useLotSerial: boolean
  publicUrl: string
  priceMinExclTax: number
  priceMinInclTax: number
  accountancySell: string
  accountancySellExport: string
  accountancyBuy: string
  accountancyBuyExport: string
  baseUnit: string
  // Already includes the "×N" suffix from the backend (matches legacy's own
  // literal "× {packing FK value}" display — confirmed via product/card.php
  // source, not a real multiplier field).
  packingUnit: string
  barcodeType: string
  manufacturer: string
  defaultWarehouse: string
  totalSoldQty: number
  // total_ttc-based (incl. tax), matching product/card.php's own
  // soldAmountTotal query exactly — confirmed live against a non-zero-VAT
  // product after an earlier 0%-VAT test product masked a total_ht mistake.
  totalSoldAmount: number
  // "Overview" section fields (product/card.php, the card right after
  // About) — all null/'' when unset, same as every other optional field
  // here; confirmed live against product id=170 (Wooden Block).
  weight: number | null
  weightUnits: number
  length: number | null
  width: number | null
  height: number | null
  lengthUnits: number
  surface: number | null
  surfaceUnits: number
  volume: number | null
  volumeUnits: number
  customCode: string
  originCountry: string
  // Real ISO 3166-1 alpha-2 code (llx_c_country.code) — the DB's own
  // `label` column is French ("Zambie"); pair this with Intl.DisplayNames
  // in the UI to render the standard English name instead of guessing a
  // translation table.
  originCountryCode: string
  originState: string
  // Real `datec` column, MySQL datetime string.
  createdAt: string
}
interface RawProductDetail extends RawProduct {
  description?: string
  categories?: { id: number; label: string }[]
  note_public?: string
  note_private?: string
  currency?: string
  zraid?: string
  zrastatus?: string
  tobatch?: number
  url?: string
  price_min?: number | string
  price_min_ttc?: number | string
  accountancy_code_sell?: string
  accountancy_code_sell_export?: string
  accountancy_code_buy?: string
  accountancy_code_buy_export?: string
  base_unit?: string
  packing_unit?: string
  barcode_type?: string
  manufacturer?: string
  default_warehouse?: string
  total_sold_qty?: number | string
  total_sold_amount?: number | string
  weight?: number | string | null
  weight_units?: number
  length?: number | string | null
  width?: number | string | null
  height?: number | string | null
  length_units?: number
  surface?: number | string | null
  surface_units?: number
  volume?: number | string | null
  volume_units?: number
  customcode?: string
  origin_country?: string
  origin_country_code?: string
  origin_state?: string
  created_at?: string
}
export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: async (): Promise<ProductDetail> => {
      const { data } = await api.get<{ success: boolean; product: RawProductDetail }>('/products/', { params: { action: 'detail', id } })
      const p = data.product

      // api/products/?action=detail stopped returning origin_country/
      // manufacturer/created_at on the currently-active backend (confirmed
      // live: the keys are simply absent from the JSON) — best-effort fill
      // them in from the real product/card.php page instead (same page this
      // whole "About" section was originally verified against). Best-effort
      // and silent on failure: this is a header/field enrichment, not
      // required data, and the rest of the page already renders correctly
      // with these fields empty (matches every other legacy-scrape fallback
      // in this app — see legacyHtmlFetch.ts).
      let cardMeta = { originCountry: '', originCountryCode: '', manufacturer: '', createdAtIso: '' }
      if (!p.origin_country || !p.manufacturer || !p.created_at) {
        try {
          const doc = await fetchLegacyDocument('/product/card.php', new URLSearchParams({ id: id! }))
          if (!looksLikeLegacyLoginPage(doc)) cardMeta = parseProductCardMeta(doc)
        } catch {
          // Legacy session unavailable — leave the fields empty, as before.
        }
      }

      return {
        ...toRow(p),
        description: p.description ?? '',
        categories: p.categories ?? [],
        notePublic: p.note_public ?? '',
        notePrivate: p.note_private ?? '',
        currency: p.currency ?? 'ZMW',
        zraId: p.zraid ?? '',
        zraStatus: p.zrastatus ?? '',
        useLotSerial: (p.tobatch ?? 0) !== 0,
        publicUrl: p.url ?? '',
        priceMinExclTax: Number(p.price_min ?? 0) || 0,
        priceMinInclTax: Number(p.price_min_ttc ?? 0) || 0,
        accountancySell: p.accountancy_code_sell ?? '',
        accountancySellExport: p.accountancy_code_sell_export ?? '',
        accountancyBuy: p.accountancy_code_buy ?? '',
        accountancyBuyExport: p.accountancy_code_buy_export ?? '',
        baseUnit: p.base_unit ?? '',
        packingUnit: p.packing_unit ?? '',
        barcodeType: p.barcode_type ?? '',
        manufacturer: p.manufacturer || cardMeta.manufacturer,
        defaultWarehouse: p.default_warehouse ?? '',
        totalSoldQty: Number(p.total_sold_qty ?? 0) || 0,
        totalSoldAmount: Number(p.total_sold_amount ?? 0) || 0,
        weight: p.weight === null || p.weight === undefined ? null : Number(p.weight),
        weightUnits: Number(p.weight_units ?? 0) || 0,
        length: p.length === null || p.length === undefined ? null : Number(p.length),
        width: p.width === null || p.width === undefined ? null : Number(p.width),
        height: p.height === null || p.height === undefined ? null : Number(p.height),
        lengthUnits: Number(p.length_units ?? 0) || 0,
        surface: p.surface === null || p.surface === undefined ? null : Number(p.surface),
        surfaceUnits: Number(p.surface_units ?? 0) || 0,
        volume: p.volume === null || p.volume === undefined ? null : Number(p.volume),
        volumeUnits: Number(p.volume_units ?? 0) || 0,
        customCode: p.customcode ?? '',
        originCountry: p.origin_country || cardMeta.originCountry,
        originCountryCode: p.origin_country_code || cardMeta.originCountryCode,
        originState: p.origin_state ?? '',
        createdAt: p.created_at || cardMeta.createdAtIso,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// Shared shape for the simple REST-backed detail tabs below (Referers) —
// same real custom endpoint (api/products/index.php), differing only by
// `action` and response key.
function useProductDetailAction<T>(action: string, id: string | undefined, responseKey: string) {
  return useQuery({
    queryKey: ['products', 'detail', action, id],
    queryFn: async (): Promise<T> => {
      const { data } = await api.get<Record<string, unknown>>('/products/', { params: { action, id } })
      // Same unrouted-action fallthrough as useUpdateProductNote above —
      // confirmed live against ecuenta9: combinations/associations/
      // referers/events all come back 200 {success:true, products:[...]}
      // with no key matching `responseKey` at all. Defaulting that to []
      // would look identical to "this product genuinely has none" instead
      // of "this backend doesn't support this action" — throw instead so
      // the tab can show the real distinction.
      if (!(responseKey in data)) throw new Error(`${BACKEND_ACTION_UNAVAILABLE_PREFIX}${action}`)
      return (data[responseKey] ?? []) as T
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export interface ProductReferer {
  invoiceId: number
  ref: string
  date: string
  paid: boolean
  status: number
  customerId: number
  customerName: string
  totalHt: number
  qty: number
}
export function useProductReferers(id: string | undefined) {
  return useProductDetailAction<ProductReferer[]>('referers', id, 'referers')
}

// Margins tab (margin/tabs/productMargins.php) — per-invoice
// selling-vs-buying margin breakdown. DISPLAY_MARGIN_RATES/DISPLAY_MARK_RATES
// are both unset on this install (confirmed live), so no rate fields here,
// matching what legacy itself actually shows.
export interface ProductMarginLine {
  invoiceId: number
  ref: string
  customerName: string
  customerCode: string
  date: string
  sellingPrice: number
  buyingPrice: number
  qty: number
  margin: number
  paid: boolean
  status: number
}
export interface ProductMargins {
  lines: ProductMarginLine[]
  totals: { sellingPrice: number; buyingPrice: number; qty: number; margin: number }
}
export function useProductMargins(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'margins', id],
    queryFn: async (): Promise<ProductMargins> => {
      const { data } = await api.get<{ success: boolean; lines?: ProductMarginLine[]; totals?: ProductMargins['totals']; products?: unknown }>('/products/', { params: { action: 'margins', id } })
      // Same unrouted-action fallthrough as useProductDetailAction — see
      // that function's comment. ecuenta9 returns {success:true,
      // products:[...]} for this action too, with no `lines`/`totals` key
      // at all.
      if (!('lines' in data)) throw new Error(`${BACKEND_ACTION_UNAVAILABLE_PREFIX}margins`)
      return { lines: data.lines ?? [], totals: data.totals ?? { sellingPrice: 0, buyingPrice: 0, qty: 0, margin: 0 } }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// Real JSON source (productinfo/api/document_api.php) — replaces the old
// product/document.php scrape. Same ProductDocumentRow shape so the tab-bar
// badge count and LinkedFilesTab don't need to change, just what feeds them.
//
// Real backend bug (confirmed live, root-caused, not fixed — frontend-only
// scope): the `view` action always returns `documents: []`, even for a
// product whose upload folder genuinely has files on disk (verified by
// uploading a real file through this exact endpoint, then finding it
// sitting untouched next to a pre-existing real file at
// documents/produit/<ref>/ — neither one is ever listed). Root cause: `view`
// calls Dolibarr's dol_dir_list() with an exclude filter of
// array('(\.meta)$', '(/thumbs)$') — the second pattern's '/' isn't escaped,
// which trips dol_dir_list()'s own filter-safety check (files.lib.php,
// around the "unescaped_slash" validation) and makes it return an empty
// array unconditionally, regardless of what's actually in the directory.
// Upload/delete both work fine (verified live); only the listing is broken,
// so a successful upload is invisible in the UI until this is fixed
// upstream.
interface RawProductDocument {
  name: string
  size: string
  date: string
  url: string
}
export function useProductDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'documents', id],
    queryFn: async (): Promise<{ count: number; totalSize: string; documents: ProductDocumentRow[] }> => {
      const body = await callProductInfoFile('document_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load documents.')
      const d = body.data as { documents: RawProductDocument[] }
      return {
        count: d.documents.length,
        totalSize: '',
        documents: d.documents.map((f) => ({ fileName: f.name, fileUrl: f.url, size: f.size, date: f.date })),
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useUploadProductDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append('action', 'upload')
      form.append('id', id)
      form.append('file', file)
      const res = await axios.post<string>('/productinfo/api/document_api.php', form, { transformResponse: (data) => data })
      const body = JSON.parse(res.data.trim()) as { success: boolean; error: string | null }
      if (!body.success) throw new Error(body.error || 'Upload failed.')
      return body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'documents', variables.id] })
    },
  })
}

export function useDeleteProductDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const body = await callProductInfoFile('document_api.php', 'delete', { id, filename })
      if (!body.success) throw new Error(body.error || 'Failed to delete this file.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'documents', variables.id] })
    },
  })
}

// Product/Card page's own dashboard AJAX endpoint (product/ajax/product_dashboard.php)
// — a real, already-JSON source for the Activity Timeline, Connections
// (customers who bought this product, by invoice count), and Teams
// (vendors who supply it, by supplier-invoice count) panels shown on the
// Product tab, all in one call. Same same-origin session-cookie pattern as
// UOM Settings above — no scraping, no new backend endpoint needed, this
// already returns exactly what's needed. Confirmed live against product
// id=170 (Wooden Block) matching the reference screenshots field-for-field.
export interface ProductTimelineEntry {
  ref: string
  invoiceId: number
  date: string
  amount: string
  customer: string
  status: string
  statusId: number
}
export interface ProductConnection {
  id: number
  name: string
  connectionsLabel: string
  initials: string
}
interface RawDashboardTimeline {
  ref: string
  id: number
  date: string
  amount: string
  customer: string
  status: string
  status_id: number
}
interface RawDashboardConnection {
  id: number
  name: string
  connections: string
  initials: string
}
export interface ProductDashboard {
  timeline: ProductTimelineEntry[]
  timelineTotal: number
  timelinePage: number
  timelinePerPage: number
  connections: ProductConnection[]
  teams: ProductConnection[]
}
export function useProductDashboard(id: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ['products', 'legacy', 'dashboard', id, page],
    queryFn: async (): Promise<ProductDashboard> => {
      const res = await fetch(`/product/ajax/product_dashboard.php?product_id=${encodeURIComponent(id!)}&page=${page}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const data: {
        timeline?: RawDashboardTimeline[]
        timeline_total?: number
        timeline_page?: number
        timeline_per_page?: number
        connections?: RawDashboardConnection[]
        teams?: RawDashboardConnection[]
      } = await res.json()
      const mapConn = (c: RawDashboardConnection): ProductConnection => ({ id: c.id, name: c.name, connectionsLabel: c.connections, initials: c.initials })
      return {
        timeline: (data.timeline ?? []).map((t) => ({ ref: t.ref, invoiceId: t.id, date: t.date, amount: t.amount, customer: t.customer, status: t.status, statusId: t.status_id })),
        timelineTotal: data.timeline_total ?? 0,
        timelinePage: data.timeline_page ?? 1,
        timelinePerPage: data.timeline_per_page ?? 10,
        connections: (data.connections ?? []).map(mapConn),
        teams: (data.teams ?? []).map(mapConn),
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// =============================================================================
// Hero header actions (Delete/Duplicate) — a real, separate JSON CRUD API,
// productinfo/api/product_api.php (session-cookie-authenticated like
// societe/api/*, unrelated to api/products/'s ?action= routing). Its
// responses are sometimes prefixed with stray CRLFs before the JSON body
// even though Content-Type says application/json (same quirk confirmed live
// on societe/api/list.php) — transformResponse + trim() before JSON.parse
// sidesteps that rather than depending on a backend fix.
export async function callProductInfoFile(file: string, action: string, params: Record<string, string>) {
  const res = await axios.post<string>(`/productinfo/api/${file}`, new URLSearchParams({ action, ...params }), { transformResponse: (data) => data })
  return JSON.parse(res.data.trim()) as { success: boolean; error: string | null; data: unknown }
}
function callProductInfoApi(action: string, params: Record<string, string>) {
  return callProductInfoFile('product_api.php', action, params)
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const body = await callProductInfoApi('delete', { id })
      // Real, confirmed backend gap: Product::delete() returns 0 (not <0)
      // when the product is in use and blocks the delete, but
      // product_api.php's `if ($result < 0)` check treats that as success —
      // it can report success:true here even when nothing was actually
      // deleted. Not fixable from the frontend (see the standing no-
      // backend-PHP-edits rule); callers should treat a reported success as
      // provisional; re-fetching the list afterward is the only way to
      // confirm it's actually gone.
      if (!body.success) throw new Error(body.error || 'Delete failed.')
      return body.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export interface DuplicateProductResult {
  id: number
  ref: string
}
export function useDuplicateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<DuplicateProductResult> => {
      const body = await callProductInfoApi('clone', { id })
      // Confirmed live: this action currently fails for every product on
      // this backend — Product::create()'s verify()-failure branch returns
      // -3 without ever setting $this->error (only $this->errors[], which
      // product_api.php's clone handler never reads), so `error` comes back
      // JSON null, not a usable message. Real bug, not fixable from the
      // frontend — surfaced with a generic message instead of a silent
      // failure or a fake success.
      if (!body.success) throw new Error(body.error || 'Duplicate failed — the backend did not report a reason.')
      return body.data as DuplicateProductResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// =============================================================================
// Stock tab — productinfo/api/stock_api.php?action=view, real, replicates
// product/stock/product.php field-for-field (verified against that PHP
// source, not the old load_product_image.php scrape this tab used before).
// pricing.* are pre-formatted display strings straight from Dolibarr's own
// price() helper (currency suffix already baked in) — shown as-is rather
// than re-parsed, same reasoning as showing outstanding_balance as text
// elsewhere in this app.
interface RawStockWarehouse {
  id: number
  ref: string
  label: string
  lieu: string
  stock_real: number
  pmp: string
  value_purchase: string
  sell_price: string
  value_sell: string
}
interface RawStockMovement {
  id: number
  date_formatted: string
  qty: number
  label: string
  warehouse: string
  user: string
}
interface RawStockView {
  product_id: number
  hasbatch: boolean
  pricing: { manage_lot_serial: string; cost_price: string; pmp: string; buying_price_min: string; selling_price: string; min_price: string }
  stock_info: { seuil_stock_alerte: number | string | null; desiredstock: number | string; stock_reel: number; stock_theorique: number; stock_below_limit: boolean; virtual_below_limit: boolean }
  stock_diff: {
    customer_orders_running?: number
    customer_orders_draft?: number
    shipment_already_sent?: number
    supplier_orders_running?: number
    supplier_orders_draft?: number
    mrp_to_consume?: number
    mrp_to_produce?: number
  }
  last_movement: string | null
  warehouses: RawStockWarehouse[]
  totals: { total_qty: number; avg_pmp: string; total_value_purchase: string; avg_sell_price: string; total_value_sell: string }
  movements: RawStockMovement[]
  all_warehouses: { id: number; ref: string; label: string }[]
  can_stock: boolean
  can_create: boolean
}

export interface ProductStockOverview {
  pricing: { costPrice: string; pmp: string; buyingPriceMin: string; sellingPrice: string; minPrice: string }
  stockAlertThreshold: string
  desiredStock: string
  physicalStock: number
  virtualStock: number
  physicalBelowLimit: boolean
  virtualBelowLimit: boolean
  lastMovement: string | null
  stockDiff: RawStockView['stock_diff']
  warehouses: { id: number; ref: string; place: string; units: number; pmp: string; valuePurchase: string; sellPriceMin: string; valueSell: string }[]
  totals: { totalQty: number; avgPmp: string; totalValuePurchase: string; avgSellPrice: string; totalValueSell: string }
  movements: { id: number; dateFormatted: string; qty: number; label: string; warehouse: string; user: string }[]
  warehouseOptions: { value: string; label: string }[]
  hasBatch: boolean
  canStock: boolean
  canEdit: boolean
}

export function useProductStockOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'stockOverview', id],
    queryFn: async (): Promise<ProductStockOverview> => {
      const body = await callProductInfoFile('stock_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load stock overview.')
      const d = body.data as RawStockView
      return {
        pricing: {
          costPrice: d.pricing.cost_price,
          pmp: d.pricing.pmp,
          buyingPriceMin: d.pricing.buying_price_min,
          sellingPrice: d.pricing.selling_price,
          minPrice: d.pricing.min_price,
        },
        stockAlertThreshold: d.stock_info.seuil_stock_alerte === null ? '' : String(d.stock_info.seuil_stock_alerte),
        desiredStock: String(d.stock_info.desiredstock ?? ''),
        physicalStock: d.stock_info.stock_reel,
        virtualStock: d.stock_info.stock_theorique,
        physicalBelowLimit: d.stock_info.stock_below_limit,
        virtualBelowLimit: d.stock_info.virtual_below_limit,
        lastMovement: d.last_movement,
        stockDiff: d.stock_diff,
        warehouses: d.warehouses.map((w) => ({ id: w.id, ref: w.ref, place: w.lieu, units: w.stock_real, pmp: w.pmp, valuePurchase: w.value_purchase, sellPriceMin: w.sell_price, valueSell: w.value_sell })),
        totals: { totalQty: d.totals.total_qty, avgPmp: d.totals.avg_pmp, totalValuePurchase: d.totals.total_value_purchase, avgSellPrice: d.totals.avg_sell_price, totalValueSell: d.totals.total_value_sell },
        movements: d.movements.map((m) => ({ id: m.id, dateFormatted: m.date_formatted, qty: m.qty, label: m.label, warehouse: m.warehouse, user: m.user })),
        warehouseOptions: d.all_warehouses.map((w) => ({ value: String(w.id), label: w.label })),
        hasBatch: d.hasbatch,
        canStock: d.can_stock,
        canEdit: d.can_create,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// Inline-editable Stock Alert Threshold / Desired Stock fields (matches the
// real page's own onchange-save inputs, see productinfo_stock.js).
export function useSetStockField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'seuil_stock_alerte' | 'desiredstock'; value: string }) => {
      const action = field === 'seuil_stock_alerte' ? 'set_stock_limit' : 'set_desired_stock'
      const body = await callProductInfoFile('stock_api.php', action, { id, [field]: value })
      if (!body.success) throw new Error(body.error || 'Save failed.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'stockOverview', variables.id] })
    },
  })
}

export interface CorrectStockInput {
  id: string
  warehouseId: string
  qty: string
  mouvement: '0' | '1' // 0 = add, 1 = remove
  label: string
  unitPrice: string
}
export function useCorrectStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CorrectStockInput) => {
      const body = await callProductInfoFile('stock_api.php', 'correct_stock', {
        id: input.id,
        warehouse_id: input.warehouseId,
        qty: input.qty,
        mouvement: input.mouvement,
        label: input.label,
        unitprice: input.unitPrice,
      })
      if (!body.success) throw new Error(body.error || 'Failed to correct stock.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'stockOverview', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
    },
  })
}

export interface TransferStockInput {
  id: string
  warehouseFrom: string
  warehouseTo: string
  qty: string
  label: string
}
export function useTransferStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransferStockInput) => {
      const body = await callProductInfoFile('stock_api.php', 'transfer_stock', {
        id: input.id,
        warehouse_from: input.warehouseFrom,
        warehouse_to: input.warehouseTo,
        qty: input.qty,
        label: input.label,
      })
      if (!body.success) throw new Error(body.error || 'Failed to transfer stock.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'stockOverview', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
    },
  })
}

// =============================================================================
// UOM tab — productinfo/api/uom_api.php?action=view, real, replicates
// product/uom_settings.php. "Available Units" is the count of every
// packing/UOM/measurement unit defined system-wide (a dictionary size, not a
// stock quantity) — confirmed by reading productinfo_uom.js's own
// buildHTML(), not guessed from the label.
interface RawUomOverviewConversion {
  id: number
  packing_unit_id: number
  packing_label: string
  uom_unit_id: number
  uom_label: string
  factor: number
  price_override_ttc: number
  barcode: string
  note: string
  is_default: boolean
}
interface RawUomUnit {
  id: number
  code: string
  label: string
  short_label: string
}
interface RawUomView {
  product_barcode: string
  product_status_batch: number
  base_unit: { label?: string; code?: string } | []
  conversions: RawUomOverviewConversion[]
  packing_units: RawUomUnit[]
  uom_units: RawUomUnit[]
  measurement_units: unknown[]
  permissions: { create: boolean }
}
export interface ProductUomOverview {
  baseUnitLabel: string
  conversionsCount: number
  availableUnitsCount: number
  productBarcode: string
  hasBatchTracking: boolean
  conversions: { id: number; packingUnitId: number; packingLabel: string; uomUnitId: number; uomLabel: string; factor: number; priceOverrideTtc: number; barcode: string; note: string; isDefault: boolean }[]
  packingUnitOptions: { value: string; label: string }[]
  uomUnitOptions: { value: string; label: string }[]
  canEdit: boolean
}
export function useProductUomOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'uomOverview', id],
    queryFn: async (): Promise<ProductUomOverview> => {
      const body = await callProductInfoFile('uom_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load UOM settings.')
      const d = body.data as RawUomView
      const baseUnit = Array.isArray(d.base_unit) ? null : d.base_unit
      return {
        baseUnitLabel: baseUnit?.label || baseUnit?.code || '—',
        conversionsCount: d.conversions.length,
        availableUnitsCount: d.packing_units.length + d.uom_units.length + d.measurement_units.length,
        productBarcode: d.product_barcode ?? '',
        hasBatchTracking: !!d.product_status_batch,
        conversions: d.conversions.map((c) => ({
          id: c.id,
          packingUnitId: c.packing_unit_id,
          packingLabel: c.packing_label,
          uomUnitId: c.uom_unit_id,
          uomLabel: c.uom_label,
          factor: c.factor,
          priceOverrideTtc: c.price_override_ttc,
          barcode: c.barcode,
          note: c.note,
          isDefault: c.is_default,
        })),
        packingUnitOptions: d.packing_units.map((u) => ({ value: String(u.id), label: `${u.label} (${u.code})` })),
        uomUnitOptions: d.uom_units.map((u) => ({ value: String(u.id), label: `${u.label} (${u.code})` })),
        canEdit: d.permissions.create,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export interface SaveUomConversionInput {
  id: string
  convId: number // 0 for a new conversion
  packingUnit: string
  uomUnit: string
  factor: string
  isDefault: boolean
  priceTtc: string
  barcode: string
  note: string
}
export function useSaveUomConversion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveUomConversionInput) => {
      const body = await callProductInfoFile('uom_api.php', 'save_conversion', {
        id: input.id,
        conv_id: String(input.convId),
        packing_unit: input.packingUnit,
        uom_unit: input.uomUnit,
        factor: input.factor,
        is_default: input.isDefault ? '1' : '0',
        price_ttc: input.priceTtc,
        barcode: input.barcode,
        note: input.note,
      })
      if (!body.success) throw new Error(body.error || 'Failed to save this UOM conversion.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', variables.id] })
    },
  })
}

export function useSaveProductBarcode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, barcode }: { id: string; barcode: string }) => {
      const body = await callProductInfoFile('uom_api.php', 'save_barcode', { id, barcode_value: barcode })
      if (!body.success) throw new Error(body.error || 'Failed to save barcode.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
    },
  })
}

export function useGenerateProductBarcode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const body = await callProductInfoFile('uom_api.php', 'generate_barcode', { id })
      if (!body.success) throw new Error(body.error || 'Failed to generate barcode.')
      return body.data as { barcode: string }
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] })
    },
  })
}

export function useDeleteUomConversion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ convId }: { id: string; convId: number }) => {
      const body = await callProductInfoFile('uom_api.php', 'delete_conversion', { conv_id: String(convId) })
      if (!body.success) throw new Error(body.error || 'Failed to delete conversion.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', variables.id] })
    },
  })
}

// =============================================================================
// Supplier Prices tab — productinfo/api/supplier_api.php?action=view, real,
// replicates product/fournisseurs.php. Unlike stock_api.php's pricing block,
// cost_price/pmp/price/unitprice here are RAW numbers straight off
// ProductFournisseur (no price() formatting applied server-side), so this
// formats them client-side with the same formatMoney() used everywhere else.
interface RawSupplierRow {
  rowid: number
  supplier_name: string
  ref_fourn: string
  unitprice: number
  quantity: number
  tva_tx: string
  delivery_time_days: number | null
  supplier_reputation_label: string
}
interface RawSupplierView {
  suppliers: RawSupplierRow[]
  cost_price: number
  pmp: number
  best_price: { unitprice: number; supplier_name: string } | null
}
export interface ProductSupplierOverview {
  suppliersCount: number
  bestUnitPrice: number | null
  avgUnitPrice: number | null
  costPrice: number
  pmp: number
  bestPriceSupplierName: string | null
  suppliers: { rowid: number; supplierName: string; refFourn: string; unitPrice: number; quantity: number; vatRate: string; deliveryDays: number | null; reputation: string }[]
}
export function useProductSupplierOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'supplierOverview', id],
    queryFn: async (): Promise<ProductSupplierOverview> => {
      const body = await callProductInfoFile('supplier_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load supplier prices.')
      const d = body.data as RawSupplierView
      const prices = d.suppliers.map((s) => s.unitprice).filter((p) => p > 0)
      const avg = prices.length ? prices.reduce((sum, p) => sum + p, 0) / prices.length : null
      return {
        suppliersCount: d.suppliers.length,
        bestUnitPrice: d.best_price?.unitprice ?? null,
        avgUnitPrice: avg,
        costPrice: d.cost_price,
        pmp: d.pmp,
        bestPriceSupplierName: d.best_price?.supplier_name ?? null,
        suppliers: d.suppliers.map((s) => ({
          rowid: s.rowid,
          supplierName: s.supplier_name,
          refFourn: s.ref_fourn,
          unitPrice: s.unitprice,
          quantity: s.quantity,
          vatRate: s.tva_tx,
          deliveryDays: s.delivery_time_days,
          reputation: s.supplier_reputation_label,
        })),
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// =============================================================================
// Edit wizard — productinfo/api/edit_wizard.php for the real, currently-
// selected dropdown options (see parseEditWizardForm's own header comment
// for why this is scraped rather than a JSON options endpoint), submitted to
// productinfo/api/product_api.php?action=update (the same real CRUD API
// Delete/Duplicate already use — see callProductInfoFile above). Field names
// on the wire match that PHP's own GETPOST() calls exactly, read directly
// from source, not guessed.
export function useProductEditFormData(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'editForm', id],
    queryFn: async (): Promise<EditWizardFormData> => {
      const doc = await fetchLegacyDocument('/productinfo/api/edit_wizard.php', new URLSearchParams({ id: id! }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseEditWizardForm(doc)
    },
    enabled: !!id,
    staleTime: 0,
    retry: false,
  })
}

export interface UpdateProductInput {
  id: string
  label: string
  ref: string
  barcode: string
  description: string
  statut: string
  statutBuy: string
  finished: string
  itemClassification: string
  countryId: string
  // Hidden passthrough — unchanged values from parseEditWizardForm's own
  // hidden* fields, resent as-is (see that interface's own comment).
  price: string
  priceMin: string
  priceBaseType: string
  tvaTx: string
  iplCatCd: string
  tlCatCd: string
  exciseTxCatCd: string
  manufactuterTpin: string
  manufacturerItemCd: string
  rrp: string
  durationValue: string
  durationUnit: string
  fkDefaultWarehouse: string
  seuilStockAlerte: string
  desiredStock: string
  units: string
  packing: string
  weight: string
  weightUnits: string
  length: string
  width: string
  height: string
  sizeUnits: string
  manufacturerId: string
  accountancySell: string
  accountancySellExport: string
  accountancyBuy: string
  accountancyBuyExport: string
  categories: string[]
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      const body = new URLSearchParams({
        action: 'update',
        id: input.id,
        label: input.label,
        ref: input.ref,
        barcode: input.barcode,
        description: input.description,
        statut: input.statut,
        statut_buy: input.statutBuy,
        finished: input.finished,
        itemclassification: input.itemClassification,
        country_id: input.countryId,
        price: input.price,
        price_min: input.priceMin,
        price_base_type: input.priceBaseType,
        tva_tx: input.tvaTx,
        iplCatCd: input.iplCatCd,
        tlCatCd: input.tlCatCd,
        exciseTxCatCd: input.exciseTxCatCd,
        manufactuterTpin: input.manufactuterTpin,
        manufacturerItemCd: input.manufacturerItemCd,
        rrp: input.rrp,
        duration_value: input.durationValue,
        duration_unit: input.durationUnit,
        fk_default_warehouse: input.fkDefaultWarehouse,
        seuil_stock_alerte: input.seuilStockAlerte,
        desiredstock: input.desiredStock,
        units: input.units,
        packing: input.packing,
        weight: input.weight,
        weight_units: input.weightUnits,
        size: input.length,
        sizewidth: input.width,
        sizeheight: input.height,
        size_units: input.sizeUnits,
        manufacturer_id: input.manufacturerId,
        accountancy_code_sell: input.accountancySell,
        accountancy_code_sell_export: input.accountancySellExport,
        accountancy_code_buy: input.accountancyBuy,
        accountancy_code_buy_export: input.accountancyBuyExport,
      })
      for (const catId of input.categories) body.append('categories[]', catId)

      const res = await axios.post<string>('/productinfo/api/product_api.php', body, { transformResponse: (data) => data })
      const parsed = JSON.parse(res.data.trim()) as { success: boolean; error: string | null; data: unknown }
      if (!parsed.success) throw new Error(parsed.error || 'Update failed.')
      return parsed.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'editForm', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// =============================================================================
// Selling Prices tab — productinfo/api/price_api.php?action=view, real,
// replicates product/price.php's standard (non-multiprice) view — confirmed
// live this deployment has neither PRODUIT_MULTIPRICES nor
// PRODUIT_CUSTOMER_PRICES_BY_QTY enabled, same single-price shape every
// other price field in this app already assumes.
interface RawPriceLogEntry {
  rowid: number
  date_str: string
  price: number
  price_ttc: number
  price_base_type: string
  price_min: number
  price_min_ttc: number
  vat_display: string
  user_name: string
}
interface RawPriceView {
  product: {
    price: number
    price_ttc: number
    price_min: number
    price_min_ttc: number
    price_base_type: string
    vat_display: string
  }
  zra: { enabled: boolean; iplCatCd_code: string; iplAmt: number; tlCatCd_code: string; tlAmt: number; exciseTxCatCd_code: string; exciseTxAmt: number }
  price_log: RawPriceLogEntry[]
  permissions: { create: boolean; delete: boolean }
}
export interface ProductPriceOverview {
  vatDisplay: string
  sellingPrice: number
  minPrice: number
  priceBaseType: string
  zra: { label: string; amount: number; code: string }[]
  priceLog: { rowid: number; dateStr: string; price: number; priceTtc: number; priceBaseType: string; priceMin: number; priceMinTtc: number; vatDisplay: string; userName: string }[]
  canDelete: boolean
}
export function useProductPriceOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'priceOverview', id],
    queryFn: async (): Promise<ProductPriceOverview> => {
      const body = await callProductInfoFile('price_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load selling prices.')
      const d = body.data as RawPriceView
      const zra: ProductPriceOverview['zra'] = []
      if (d.zra.enabled && d.zra.iplCatCd_code) zra.push({ label: 'IPL category code', amount: d.zra.iplAmt, code: d.zra.iplCatCd_code })
      if (d.zra.enabled && d.zra.tlCatCd_code) zra.push({ label: 'TL category code', amount: d.zra.tlAmt, code: d.zra.tlCatCd_code })
      if (d.zra.enabled && d.zra.exciseTxCatCd_code) zra.push({ label: 'Excise tax category code', amount: d.zra.exciseTxAmt, code: d.zra.exciseTxCatCd_code })
      return {
        vatDisplay: d.product.vat_display,
        sellingPrice: d.product.price_base_type === 'TTC' ? d.product.price_ttc : d.product.price,
        minPrice: d.product.price_base_type === 'TTC' ? d.product.price_min_ttc : d.product.price_min,
        priceBaseType: d.product.price_base_type,
        zra,
        priceLog: d.price_log.map((p) => ({
          rowid: p.rowid,
          dateStr: p.date_str,
          price: p.price,
          priceTtc: p.price_ttc,
          priceBaseType: p.price_base_type,
          priceMin: p.price_min,
          priceMinTtc: p.price_min_ttc,
          vatDisplay: p.vat_display,
          userName: p.user_name,
        })),
        canDelete: d.permissions.delete,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useDeletePriceLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, lineId }: { id: string; lineId: number }) => {
      const body = await callProductInfoFile('price_api.php', 'delete_log', { id, lineid: String(lineId) })
      if (!body.success) throw new Error(body.error || 'Failed to delete this price log entry.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'priceOverview', variables.id] })
    },
  })
}

// =============================================================================
// Variants tab — productinfo/api/variant_api.php, real, replicates
// variants/combinations.php.
interface RawVariantAttrValue {
  id: number
  ref: string
  value: string
}
interface RawVariantAttr {
  id: number
  ref: string
  label: string
  values: RawVariantAttrValue[]
}
interface RawCombination {
  combination_id: number
  fk_product_child: number
  child_ref: string
  child_label: string
  child_price_ttc: number
  child_stock: number
  child_status: number
  child_status_buy: number
  variation_price: number
  attributes: { attr_label: string; val_value: string }[]
}
interface RawVariantView {
  attributes: RawVariantAttr[]
  combinations: RawCombination[]
  permissions: { create: boolean; delete: boolean }
}
export interface ProductVariantOverview {
  attributes: { id: number; label: string; values: { id: number; value: string }[] }[]
  combinations: {
    id: number
    childId: number
    ref: string
    label: string
    priceTtc: number
    stock: number
    forSale: boolean
    forPurchase: boolean
    variationPrice: number
    attributes: { label: string; value: string }[]
  }[]
  totalValues: number
  canEdit: boolean
  canDelete: boolean
}
export function useProductVariantOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'variantOverview', id],
    queryFn: async (): Promise<ProductVariantOverview> => {
      const body = await callProductInfoFile('variant_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load variants.')
      const d = body.data as RawVariantView
      return {
        attributes: d.attributes.map((a) => ({ id: a.id, label: a.label, values: a.values.map((v) => ({ id: v.id, value: v.value })) })),
        combinations: d.combinations.map((c) => ({
          id: c.combination_id,
          childId: c.fk_product_child,
          ref: c.child_ref,
          label: c.child_label,
          priceTtc: c.child_price_ttc,
          stock: c.child_stock,
          forSale: c.child_status === 1,
          forPurchase: c.child_status_buy === 1,
          variationPrice: c.variation_price,
          attributes: c.attributes.map((a) => ({ label: a.attr_label, value: a.val_value })),
        })),
        totalValues: d.attributes.reduce((sum, a) => sum + a.values.length, 0),
        canEdit: d.permissions.create,
        canDelete: d.permissions.delete,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export interface CreateCombinationInput {
  id: string
  features: string[] // "attrId-valueId" pairs
  reference: string
  priceImpact: string
  priceImpactPercent: boolean
  weightImpact: string
}
export function useCreateCombination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCombinationInput) => {
      const body = new URLSearchParams({
        action: 'create_combination',
        id: input.id,
        reference: input.reference,
        price_impact: input.priceImpact,
        price_impact_percent: input.priceImpactPercent ? '1' : '0',
        weight_impact: input.weightImpact,
      })
      for (const f of input.features) body.append('features[]', f)
      const res = await axios.post<string>('/productinfo/api/variant_api.php', body, { transformResponse: (data) => data })
      const parsed = JSON.parse(res.data.trim()) as { success: boolean; error: string | string[] | null }
      // Real backend bug (confirmed live, not fixed — frontend-only scope):
      // variant_api.php's create_combination handler calls Dolibarr's
      // ProductCombination::createProductCombination() with $weight_impact
      // passed as a raw float where that positional arg ($forced_weightvar)
      // is expected to be a per-level array — unlike $level_price_impact
      // right next to it, which IS correctly wrapped as array(1 => ...).
      // That mismatch makes the call fail and the handler falls back to
      // `$prodcomb->errors` containing a single null entry, so `error` comes
      // back as the JSON array [null] instead of a string — every
      // combination create attempt on this install fails as a result.
      // Coercing defensively here so the modal shows a real message instead
      // of a blank one.
      if (!parsed.success) {
        const message = Array.isArray(parsed.error) ? parsed.error.filter(Boolean).join(', ') : parsed.error
        throw new Error(message || 'Failed to create combination.')
      }
      return parsed
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'variantOverview', variables.id] })
    },
  })
}

export function useDeleteCombination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, combinationId }: { id: string; combinationId: number }) => {
      const body = await callProductInfoFile('variant_api.php', 'delete_combination', { id, combination_id: String(combinationId) })
      if (!body.success) throw new Error(body.error || 'Failed to delete this combination.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'variantOverview', variables.id] })
    },
  })
}

// =============================================================================
// Composition tab — productinfo/api/subproduct_api.php, real, replicates
// product/composition/card.php.
interface RawParentProduct {
  id: number
  ref: string
  label: string
  qty: number
}
interface RawComposition {
  id: number
  ref: string
  label: string
  nb: number
  stock: number
  level: number
  fourn_price: number
  fourn_defined: number
  sell_price_numeric: number | null
}
interface RawCompositionView {
  product: { finished: string; finished_label: string | number; price_display: string }
  parents: RawParentProduct[]
  compositions: RawComposition[]
  total_buy: number
  total_sell: number
  permissions: { create: boolean }
}
// Backend bug (confirmed live, not fixed — frontend-only scope): for a
// product whose `finished` code isn't 0 or 1, subproduct_api.php's label
// lookup falls through and returns the raw fallback code (-1) as
// `finished_label` instead of resolving it to text. Normalizing here so the
// UI never shows a bare "-1" instead of a real word.
function normalizeNatureLabel(finishedLabel: string | number): string {
  if (typeof finishedLabel === 'string' && finishedLabel.trim() && !/^-?\d+$/.test(finishedLabel.trim())) return finishedLabel
  return 'Not defined'
}
export interface ProductCompositionOverview {
  natureLabel: string
  priceDisplay: string
  parents: { id: number; ref: string; label: string; qty: number }[]
  compositions: { id: number; ref: string; label: string; qty: number; stock: number; buyPrice: number; buyDefined: boolean; sellPrice: number | null }[]
  totalBuy: number
  totalSell: number
  canEdit: boolean
}
export function useProductCompositionOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'compositionOverview', id],
    queryFn: async (): Promise<ProductCompositionOverview> => {
      const body = await callProductInfoFile('subproduct_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load composition.')
      const d = body.data as RawCompositionView
      return {
        natureLabel: normalizeNatureLabel(d.product.finished_label),
        priceDisplay: d.product.price_display,
        parents: d.parents.map((p) => ({ id: p.id, ref: p.ref, label: p.label, qty: p.qty })),
        compositions: d.compositions
          .filter((c) => c.level <= 1)
          .map((c) => ({ id: c.id, ref: c.ref, label: c.label, qty: c.nb, stock: c.stock, buyPrice: c.fourn_price, buyDefined: !!c.fourn_defined, sellPrice: c.sell_price_numeric })),
        totalBuy: d.total_buy,
        totalSell: d.total_sell,
        canEdit: d.permissions.create,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useAddSubproduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, childId, qty, incdec }: { id: string; childId: string; qty: string; incdec: boolean }) => {
      const body = await callProductInfoFile('subproduct_api.php', 'add_subproduct', { id, child_id: childId, qty, incdec: incdec ? '1' : '0' })
      if (!body.success) throw new Error(body.error || 'Failed to add sub-product.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'compositionOverview', variables.id] })
    },
  })
}

export function useDeleteSubproduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, childId }: { id: string; childId: number }) => {
      const body = await callProductInfoFile('subproduct_api.php', 'delete_subproduct', { id, child_id: String(childId) })
      if (!body.success) throw new Error(body.error || 'Failed to remove sub-product.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'compositionOverview', variables.id] })
    },
  })
}

// =============================================================================
// Statistics tab — productinfo/api/stats_api.php, real sales/purchase
// figures + top customers (replaces the old product/stats/card.php scrape).
interface RawStatsMonth {
  month: string
  qty: number
  amount: number
}
interface RawTopCustomer {
  id: number
  name: string
  qty: number
  amount: number
}
interface RawStatsView {
  sales_data: RawStatsMonth[]
  purchase_data: RawStatsMonth[]
  sales_total: { qty: number; amount: number }
  purchase_total: { qty: number; amount: number }
  top_customers: RawTopCustomer[]
}
export interface ProductStatsOverview {
  totalSales: number
  totalPurchase: number
  qtySold: number
  marginPct: number
  monthly: { month: string; sales: number; purchase: number; qty: number }[]
  topCustomers: { id: number; name: string; qty: number; total: number }[]
}
export function useProductStatsOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'statsOverview', id],
    queryFn: async (): Promise<ProductStatsOverview> => {
      const body = await callProductInfoFile('stats_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load statistics.')
      const d = body.data as RawStatsView
      const months = Array.from(new Set([...d.sales_data.map((m) => m.month), ...d.purchase_data.map((m) => m.month)])).sort()
      const totalSales = d.sales_total.amount
      const totalPurchase = d.purchase_total.amount
      const margin = totalSales > 0 ? ((totalSales - totalPurchase) / totalSales) * 100 : 0
      return {
        totalSales,
        totalPurchase,
        qtySold: d.sales_total.qty,
        marginPct: margin,
        monthly: months.map((month) => ({
          month,
          sales: d.sales_data.find((m) => m.month === month)?.amount ?? 0,
          purchase: d.purchase_data.find((m) => m.month === month)?.amount ?? 0,
          qty: d.sales_data.find((m) => m.month === month)?.qty ?? 0,
        })),
        topCustomers: d.top_customers.map((c) => ({ id: c.id, name: c.name, qty: c.qty, total: c.amount })),
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// =============================================================================
// Notes tab — productinfo/api/note_api.php, real (replaces the old
// api/products/?action=update-note, which is unrouted on this backend — see
// BACKEND_ACTION_UNAVAILABLE_PREFIX's own note elsewhere in this file).
export function useProductNotesOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'notes', id],
    queryFn: async (): Promise<{ notePublic: string; notePrivate: string }> => {
      const body = await callProductInfoFile('note_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load notes.')
      const d = body.data as { note_public: string; note_private: string }
      return { notePublic: d.note_public ?? '', notePrivate: d.note_private ?? '' }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useSaveProductNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notePublic, notePrivate }: { id: string; notePublic: string; notePrivate: string }) => {
      const body = await callProductInfoFile('note_api.php', 'update', { id, note_public: notePublic, note_private: notePrivate })
      if (!body.success) throw new Error(body.error || 'Failed to save notes.')
      return body.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'notes', variables.id] })
    },
  })
}

// =============================================================================
// Events tab — productinfo/api/agenda_api.php's own `events` array (real
// agenda/actioncomm entries for this product). Activity Timeline/Connections/
// Teams on the Product Card tab already use product/ajax/product_dashboard.php
// (see useProductDashboard) for the same underlying concept — this only
// pulls the `events` field that endpoint doesn't carry.
export interface ProductAgendaEvent {
  id: number
  label: string
  date: string
  dateEnd: string | null
  typeLabel: string
  userName: string
  percent: number
  status: 'success' | 'warning' | 'info' | 'secondary'
}
export function useProductAgendaEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'agendaEvents', id],
    queryFn: async (): Promise<ProductAgendaEvent[]> => {
      const body = await callProductInfoFile('agenda_api.php', 'view', { id: id! })
      if (!body.success) throw new Error(body.error || 'Failed to load events.')
      const d = body.data as {
        events: { id: number; label: string; date: string; date_end: string | null; type_label: string; user_name: string; percent: number; status: 'success' | 'warning' | 'info' | 'secondary' }[]
      }
      return d.events.map((e) => ({ id: e.id, label: e.label, date: e.date, dateEnd: e.date_end, typeLabel: e.type_label, userName: e.user_name, percent: e.percent, status: e.status }))
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// =============================================================================
// Invoice Stats tab — productinfo/api/invoice_stats_api.php, real customer
// invoices with product, paginated + filterable by month/year (replaces the
// old product/stats/facture.php scrape). Returns referers summary + invoice
// detail list matching the legacy "Related items" table.
interface RawReferer {
  label: string
  icon: string
  link: string
  nb_thirdparties: string | number
  nb_objects: string | number
  qty: string | number
}
interface RawInvoice {
  facid: number
  ref: string
  socid: number
  company: string
  code_client: string
  datef: string
  datef_formatted: string
  qty: number
  total_ht: number
  total_ht_formatted: string
  paye: number
  statut: number
  type: number
  status_label: string
  status_class: string
  payment_pct: number
  paiement: number
  is_credit_note: boolean
}
interface RawInvoiceStatsView {
  referers: RawReferer[]
  invoices: RawInvoice[]
  total_ht: number
  total_qty: number
  total_records: number
  years: number[]
  limit: number
  page: number
  sortfield: string
  sortorder: string
  search_month: number
  search_year: number
}
export interface InvoiceStatsReferer {
  label: string
  icon: string
  nbThirdparties: number
  nbObjects: string
  qty: string
}
export interface InvoiceStatsInvoice {
  id: number
  ref: string
  companyId: number
  company: string
  customerCode: string
  date: string
  qty: number
  totalHT: number
  totalFormatted: string
  status: 'Paid' | 'Unpaid' | 'Draft' | 'Abandoned'
  statusClass: 'success' | 'warning' | 'secondary' | 'danger'
  paymentPct: number
  paid: number
  isCreditNote: boolean
}
export interface ProductInvoiceStats {
  referers: InvoiceStatsReferer[]
  invoices: InvoiceStatsInvoice[]
  totalHT: number
  totalQty: number
  totalRecords: number
  years: number[]
  currentPage: number
  pageSize: number
  currentMonth: number
  currentYear: number
  totalPages: number
}
export function useProductInvoiceStats(id: string | undefined, page: number = 0, month: number = 0, year: number = 0, pageSize: number = 20) {
  return useQuery({
    queryKey: ['products', 'detail', 'invoiceStats', id, page, month, year, pageSize],
    queryFn: async (): Promise<ProductInvoiceStats> => {
      const body = await callProductInfoFile('invoice_stats_api.php', 'view', {
        id: id!,
        page: String(page),
        limit: String(pageSize),
        search_month: String(month),
        search_year: String(year),
      })
      if (!body.success) throw new Error(body.error || 'Failed to load invoice stats.')
      const d = body.data as RawInvoiceStatsView
      const totalPages = Math.ceil(d.total_records / d.limit)
      return {
        referers: d.referers.map((r) => ({
          label: r.label,
          icon: r.icon,
          nbThirdparties: typeof r.nb_thirdparties === 'string' ? parseInt(r.nb_thirdparties) || 0 : r.nb_thirdparties,
          nbObjects: String(r.nb_objects),
          qty: String(r.qty),
        })),
        invoices: d.invoices.map((inv) => ({
          id: inv.facid,
          ref: inv.ref,
          companyId: inv.socid,
          company: inv.company,
          customerCode: inv.code_client,
          date: inv.datef,
          qty: inv.qty,
          totalHT: inv.total_ht,
          totalFormatted: inv.total_ht_formatted,
          status: inv.status_label as 'Paid' | 'Unpaid' | 'Draft' | 'Abandoned',
          statusClass: inv.status_class as 'success' | 'warning' | 'secondary' | 'danger',
          paymentPct: inv.payment_pct,
          paid: inv.paiement,
          isCreditNote: inv.is_credit_note,
        })),
        totalHT: d.total_ht,
        totalQty: d.total_qty,
        totalRecords: d.total_records,
        years: d.years,
        currentPage: d.page,
        pageSize: d.limit,
        currentMonth: d.search_month,
        currentYear: d.search_year,
        totalPages,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}
