import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { resolveBackendAsset } from '../../api/backends'
import { fapiGet } from '../../api/fapiEnvelope'
import {
  cloneProduct,
  correctProductStock,
  createProductCombination,
  deleteProduct,
  deleteProductCombination,
  deleteProductCompositionChild,
  deleteProductDocumentFile,
  deleteProductDocumentLink,
  linkProductDocument,
  deleteProductPriceLog,
  deleteProductUomConversion,
  getProduct,
  getProductAgenda,
  getProductComposition,
  getProductDashboard,
  getProductDocuments,
  getProductFormOptions,
  getProductInvoiceStats,
  getProductMargins,
  getProductNotes,
  getProductPrices,
  getProductStats,
  getProductStock,
  getProductSuppliers,
  getProductUom,
  getProductVariants,
  getProductsSummary,
  isMissingEndpoint,
  listAllProducts,
  saveProductCompositionChild,
  saveProductNotes,
  saveProductUomConversion,
  setProductBatchTracking,
  searchProducts,
  setProductStockLimits,
  transferProductStock,
  updateProduct,
  updateProductPrice,
  updateProductZraLevies,
  generateProductBarcode,
  getProductEditForm,
  type ProductZraLevies,
  type ProductWriteFields,
  uploadProductDocument,
  type ProductDashboardData,
  type ProductInvoiceStatsData,
  type ProductSummaryData,
} from '../../api/products'
import { formatMoney } from '../../utils/format'
import { NATURE_OPTIONS } from './productConstants'
import { BACKEND_ACTION_UNAVAILABLE_PREFIX } from '../../shared/components/BackendUnavailable'
import { legacyJsonBody } from '../../shared/legacyHtmlFetch'
import { loadBindableAccounts } from '../generalLedger/bindingFapi'
import type { RichProductRow } from './productRich'
import { parseListDate, richRowFromListItem } from './productListMapper'
import {
  type ProductDetailPanel,
  type ProductDocumentRow,
  type ProductLinkRow,
} from './productTypes'

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
  // tva_rate field — it omits the " (A)" code suffix that tva_tx carries,
  // unlike vatRate above.
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
  // `finished` column (Dolibarr's "Nature of product" — 1=Raw Material,
  // 2=Finished Product, 3=Service; see productConstants.ts's NATURE_OPTIONS).
  finished: number
  // Real `rrp` column (Recommended Retail Price) — 0 when unset, same as
  // every other numeric field here.
  rrp: number
  // `image_url`/`has_image` — returned by the backend's buildProductRow()
  // for every list/detail response. Root-relative path; resolve with
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

// GET /api/products/ response shape.
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

// GET /api/products/. Products and services share this one endpoint
// (fk_product_type distinguishes them), so both hooks below query the same
// cache key and split client-side rather than each making their own
// request. `enabled` lets a picker that is only sometimes shown skip the
// request until it opens.
export function useProductRows(enabled = true) {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const { data } = await api.get<unknown>('/products/', { params: { limit: 250 } })
      const body = legacyJsonBody<ProductsResponse>(data, 'Products API')
      if (!Array.isArray(body.products)) throw new Error('Products API did not return product records.')
      return { rows: body.products.map(toRow), currency: body.currency ?? '' }
    },
    staleTime: 1000 * 60,
    enabled,
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

// product/fapi/summary.php — stock, ZRA and category figures the product list rows
// cannot give (stock counts only stock-managed products, value is at weighted
// average cost). null on a backend that does not have the endpoint, so the area
// simply omits those tiles.
export function useProductAreaSummary() {
  return useQuery({
    queryKey: ['products', 'areaSummary'],
    queryFn: async (): Promise<ProductSummaryData | null> => {
      try {
        return await getProductsSummary()
      } catch (error) {
        if (isMissingEndpoint(error)) return null
        throw error
      }
    },
    staleTime: 1000 * 60,
    retry: false,
  })
}

// VAT categories (rate plus code, e.g. 16% (A)) from product/fapi/form_options.php, for
// forms whose lines carry the code. null on a backend without that endpoint, so a
// form can fall back to a plain rate field.
export interface VatRateOption {
  value: string
  label: string
  rate: number
  code: string
}
export function useVatRateOptions() {
  return useQuery({
    queryKey: ['products', 'vatRateOptions'],
    queryFn: async (): Promise<VatRateOption[] | null> => {
      try {
        const seen = new Set<string>()
        return (await getProductFormOptions()).vat_rates
          .filter((v) => (seen.has(`${v.rate}|${v.code}`) ? false : (seen.add(`${v.rate}|${v.code}`), true)))
          .map((v) => ({ value: `${v.rate}|${v.code}`, label: `${v.rate}%${v.code ? ` (${v.code})` : ''}`, rate: v.rate, code: v.code }))
      } catch (error) {
        if (isMissingEndpoint(error)) return null
        throw error
      }
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

// Trimmed-down view of the same data, for <select> pickers on create forms.
export function useProductOptions(enabled = true) {
  const { data, ...rest } = useProductRows(enabled)
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
    queryFn: async ({ signal }): Promise<ProductSearchResult[]> => {
      try {
        // product/fapi/search.php ranks exact ref / barcode / prefix matches first. A search the user has typed past is cancelled.
        const found = await searchProducts(query.trim(), {}, signal)
        return found.items.slice(0, 20).map((p) => ({ id: String(p.id), ref: p.ref, label: p.label }))
      } catch (error) {
        if (!isMissingEndpoint(error)) throw error
      }
      const { data } = await api.get<ProductsResponse>('/products/', { params: { action: 'list', search: query, limit: 20 }, signal })
      return (data.products ?? []).map((p) => ({ id: String(p.id ?? ''), ref: p.ref ?? '', label: p.label ?? '' }))
    },
    enabled: query.trim().length > 1,
    staleTime: 1000 * 30,
  })
}

// The "All Products" report (product/allproducts.php) shows several columns
// /api/products/ doesn't have (Category, Desired/Reserved/Physical stock
// breakdown, ZRA status, Classification, Country). They come from
// product/fapi/list.php; a backend without that endpoint still answers through
// Dolibarr's own DataTables AJAX endpoint (see productAjax.ts), which also
// carries the Lot status and avatar colours the JSON list does not.
// Best-effort: ProductsList.tsx falls back to "—" per-cell if this fails rather
// than blocking the page, same pattern as useWarehouseLegacyStats.
export function useAllProductsRich(type: 0 | 1) {
  return useQuery({
    queryKey: ['products', 'ajaxRich', type],
    queryFn: async (): Promise<RichProductRow[]> => {
      return (await listAllProducts({ type })).map(richRowFromListItem)
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
export type { RichProductRow }

// Whether ZRA is switched on for this instance: product/fapi/prices.php answers zra.enabled with the instance-wide setting
// (false on newecuenta). Any product id will do; the Product List uses it to show the ZRA column only when ZRA is on.
export function useZraEnabled(sampleProductId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'zraEnabled'],
    queryFn: async (): Promise<boolean> => Boolean((await getProductPrices(sampleProductId!)).zra?.enabled),
    enabled: !!sampleProductId,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

// Row-click detail panel — see ProductsList.tsx's expandedId state. Read from
// product/fapi/get.php (photo, per-warehouse stock, prices, ZRA); a backend
// without it falls back to the product/load_product_image.php HTML fragment.
export function panelFromGet(d: Awaited<ReturnType<typeof getProduct>>): ProductDetailPanel {
  const p = d.product
  const warehouseStock = (d.stock.by_warehouse as { warehouse_id?: number; warehouse?: string; real?: number }[]).map((w) => ({
    warehouse: w.warehouse ?? `#${w.warehouse_id ?? ''}`,
    warehouseUrl: null,
    quantity: Number(w.real ?? 0),
  }))
  return {
    kind: Number(p.type) === 1 ? 'service' : 'product',
    zraCodeIsDefault: d.zra.code === '000',
    ref: p.ref,
    label: p.label,
    zraProductCode: d.zra.code || d.zra.id || '',
    priceInclTax: formatMoney(Number(p.price_ttc ?? 0)),
    rrp: p.rrp ? formatMoney(Number(p.rrp)) : '',
    classificationCode: d.zra.classification ?? '',
    images: d.photo ? [{ thumbUrl: resolveBackendAsset(d.photo), fullUrl: resolveBackendAsset(d.photo) }] : [],
    warehouseStock,
    totalStock: Number(d.stock.real ?? warehouseStock.reduce((sum, w) => sum + w.quantity, 0)),
    notFound: false,
  }
}

const EMPTY_PANEL: ProductDetailPanel = { kind: 'product', zraCodeIsDefault: false, ref: '', label: '', zraProductCode: '', priceInclTax: '', rrp: '', classificationCode: '', images: [], warehouseStock: [], totalStock: 0, notFound: true }

export function useProductDetailPanel(id: string | null) {
  return useQuery({
    queryKey: ['products', 'legacy', 'detailPanel', id],
    queryFn: (): Promise<ProductDetailPanel> =>
      (async () => {
          try {
            return panelFromGet(await getProduct(id!))
          } catch (error) {
            if (error instanceof Error && /not found/i.test(error.message)) return EMPTY_PANEL
            throw error
          }
        })(),
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

// GET /api/products/?action=detail&id=X (handleProductDetail() in
// api/products/index.php). Full field set for the Card tab, plus
// categories/note_public/note_private for their own tabs.
export interface ProductDetail extends ProductRow {
  description: string
  vatRate: string
  categories: { id: number; label: string }[]
  notePublic: string
  notePrivate: string
  currency: string
  // "About" section fields (product/card.php): zraid/zrastatus/accountancy
  // codes/base+packing units/barcode type/manufacturer/total sold.
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
  // soldAmountTotal query.
  totalSoldAmount: number
  // "Overview" section fields (product/card.php, the card right after
  // About) — all null/'' when unset, same as every other optional field
  // here.
  weight: number | null
  // Unit codes stay null when the product has none set (the classic page then shows the bare number); 0 is a real code (kg).
  weightUnits: number | null
  length: number | null
  width: number | null
  height: number | null
  lengthUnits: number | null
  surface: number | null
  surfaceUnits: number | null
  volume: number | null
  volumeUnits: number | null
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
  weight_units?: number | string | null
  length?: number | string | null
  width?: number | string | null
  height?: number | string | null
  length_units?: number | string | null
  surface?: number | string | null
  surface_units?: number | string | null
  volume?: number | string | null
  volume_units?: number | string | null
  customcode?: string
  origin_country?: string
  origin_country_code?: string
  origin_state?: string
  created_at?: string
}
// Chart-of-accounts names by account number ("5017" -> "Sales"), so a product's accountancy codes read "5017 - Sales" like the classic card.
// One cached read of the chart; a failed read only leaves the bare codes.
export function useAccountNames(enabled: boolean) {
  return useQuery({
    queryKey: ['products', 'accountNames'],
    queryFn: async (): Promise<Map<string, string>> => {
      const names = new Map<string, string>()
      for (const { label } of await loadBindableAccounts()) {
        const at = label.indexOf(' - ')
        if (at > 0) names.set(label.slice(0, at), label.slice(at + 3))
      }
      return names
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

export function unitCode(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: async (): Promise<ProductDetail> => {
      // product/fapi/get.php carries what /api/products/?action=detail leaves out (creation date, origin country
      // code, categories, ZRA id and status). Best-effort: a failed call leaves those fields empty.
      const [{ data }, extra] = await Promise.all([
        api.get<{ success: boolean; product: RawProductDetail }>('/products/', { params: { action: 'detail', id } }),
        getProduct(id!, { withStock: false, withPrices: false }).catch(() => null),
      ])
      // /api/products/?action=detail leaves out several columns on current backends (item code, base and packing unit, nature,
      // "for purchase", origin, custom code, units); product/fapi/get.php has them, so it fills whatever the first call left empty.
      const x: Record<string, unknown> = extra?.product ?? {}
      const xs = (key: string): string => (typeof x[key] === 'string' ? (x[key] as string) : '')
      const xn = (key: string): number | undefined => (x[key] === null || x[key] === undefined || x[key] === '' ? undefined : Number(x[key]))
      const xr = (key: string): number | string | null | undefined => (x[key] === undefined ? undefined : (x[key] as number | string | null))
      const xPackingUnit = xs('packing_unit') ? `${xs('packing_unit')}${xn('packing') ? ` ×${xn('packing')}` : ''}` : ''
      const p: RawProductDetail = {
        ...data.product,
        finished: data.product.finished ?? xn('finished'),
        tobuy: data.product.tobuy ?? xn('tobuy'),
        itemclassification: data.product.itemclassification || xs('itemclassification'),
        image_url: data.product.image_url || xs('image_url'),
        has_image: data.product.has_image ?? xn('has_image'),
        // Weight, size, area and volume (with their unit codes): the older call leaves them out, get.php has them.
        weight: data.product.weight ?? xr('weight'),
        weight_units: data.product.weight_units ?? xr('weight_units'),
        length: data.product.length ?? xr('length'),
        width: data.product.width ?? xr('width'),
        height: data.product.height ?? xr('height'),
        length_units: data.product.length_units ?? xr('length_units'),
        surface: data.product.surface ?? xr('surface'),
        surface_units: data.product.surface_units ?? xr('surface_units'),
        volume: data.product.volume ?? xr('volume'),
        volume_units: data.product.volume_units ?? xr('volume_units'),
      }
      const fapiCreated = parseListDate(typeof extra?.product.date_creation === 'string' ? extra.product.date_creation : '')
      const fapiCountryCode = typeof extra?.product.country_code === 'string' ? extra.product.country_code : ''

      return {
        ...toRow(p),
        description: p.description ?? '',
        categories: p.categories?.length ? p.categories : (extra?.categories ?? []).map((c) => ({ id: c.id, label: c.label })),
        notePublic: p.note_public ?? '',
        notePrivate: p.note_private ?? '',
        currency: p.currency ?? '',
        zraId: p.zraid || extra?.zra.id || '',
        zraStatus: p.zrastatus || extra?.zra.status || '',
        useLotSerial: (p.tobatch ?? 0) !== 0,
        publicUrl: p.url ?? '',
        priceMinExclTax: Number(p.price_min ?? 0) || 0,
        priceMinInclTax: Number(p.price_min_ttc ?? 0) || 0,
        accountancySell: p.accountancy_code_sell || xs('accountancy_code_sell'),
        accountancySellExport: p.accountancy_code_sell_export || xs('accountancy_code_sell_export'),
        accountancyBuy: p.accountancy_code_buy || xs('accountancy_code_buy'),
        accountancyBuyExport: p.accountancy_code_buy_export || xs('accountancy_code_buy_export'),
        baseUnit: p.base_unit || xs('base_unit'),
        packingUnit: p.packing_unit || xPackingUnit,
        barcodeType: p.barcode_type || xs('barcode_type'),
        manufacturer: p.manufacturer || xs('manufacturer'),
        defaultWarehouse: p.default_warehouse || xs('default_warehouse'),
        totalSoldQty: Number(p.total_sold_qty ?? 0) || 0,
        totalSoldAmount: Number(p.total_sold_amount ?? 0) || 0,
        weight: p.weight === null || p.weight === undefined ? null : Number(p.weight),
        weightUnits: unitCode(p.weight_units),
        length: p.length === null || p.length === undefined ? null : Number(p.length),
        width: p.width === null || p.width === undefined ? null : Number(p.width),
        height: p.height === null || p.height === undefined ? null : Number(p.height),
        lengthUnits: unitCode(p.length_units),
        surface: p.surface === null || p.surface === undefined ? null : Number(p.surface),
        surfaceUnits: unitCode(p.surface_units),
        volume: p.volume === null || p.volume === undefined ? null : Number(p.volume),
        volumeUnits: unitCode(p.volume_units),
        customCode: p.customcode || xs('customcode'),
        originCountry: p.origin_country || xs('origin_country'),
        originCountryCode: p.origin_country_code || xs('origin_country_code') || fapiCountryCode,
        originState: p.origin_state || xs('origin_state'),
        createdAt: p.created_at || (fapiCreated.time ? new Date(fapiCreated.time).toISOString() : ''),
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
      // some backends answer combinations/associations/referers/events with
      // 200 {success:true, products:[...]} and no key matching `responseKey`
      // at all. Defaulting that to [] would look identical to "this product
      // has none" instead of "this backend doesn't support this action" —
      // throw instead so the tab can show the distinction.
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
// are both unset on this install, so no rate fields here, matching what
// legacy itself shows.
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
  // null when the source gives no payment state for that invoice.
  paid: boolean | null
  status: number
}
export interface ProductMargins {
  lines: ProductMarginLine[]
  totals: { sellingPrice: number; buyingPrice: number; qty: number; margin: number }
  // How many lines carry the buying price recorded at the time of sale; the rest
  // use the product's current weighted average cost (pmp). null on the old source.
  costBasis: { linesTotal: number; linesWithRecordedCost: number; currentPmp: number } | null
}

// product/fapi/margins.php — revenue, cost and margin per invoice line. Its lines
// carry no payment state, so the invoice statistics (same endpoint family) supply it.
async function fetchProductMargins(id: string): Promise<ProductMargins> {
  const [m, invoiceStats] = await Promise.all([getProductMargins(id), getProductInvoiceStats(id).catch(() => null)])
  const paidByInvoice = new Map((invoiceStats?.lines ?? []).map((l) => [l.invoice_id, l.paid === 1]))
  return {
    lines: m.lines.map((l) => ({
      invoiceId: l.invoice_id,
      ref: l.ref,
      customerName: l.customer,
      customerCode: '',
      date: l.date,
      sellingPrice: l.revenue_ht,
      buyingPrice: l.cost_ht,
      qty: l.qty,
      margin: l.margin,
      paid: paidByInvoice.get(l.invoice_id) ?? null,
      status: 0,
    })),
    totals: { sellingPrice: m.summary.revenue_ht, buyingPrice: m.summary.cost_ht, qty: m.summary.qty, margin: m.summary.margin },
    costBasis: { linesTotal: m.basis.lines_total, linesWithRecordedCost: m.basis.lines_with_recorded_cost, currentPmp: m.basis.current_pmp },
  }
}

export function useProductMargins(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'margins', id],
    queryFn: (): Promise<ProductMargins> =>
      (() => fetchProductMargins(id!))(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useProductDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'documents', id],
    queryFn: (): Promise<{ count: number; totalSize: string; documents: ProductDocumentRow[]; links: ProductLinkRow[] }> =>
      (async () => {
          const d = await getProductDocuments(id!)
          return {
            count: d.meta?.count ?? d.files.length,
            totalSize: '',
            documents: d.files.map((f) => ({ fileName: f.name, fileUrl: f.url, size: String(f.size ?? ''), sizeBytes: f.size_raw, date: f.date })),
            links: (d.links ?? []).map((l) => ({ id: l.id, label: l.label, url: l.url, date: l.date })),
          }
        })(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useUploadProductDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      (() => uploadProductDocument(id, file))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'documents', variables.id] })
    },
  })
}

// "Link a new file/document": a URL link next to the product (documents.php?action=link), and its removal (action=delete_link).
export function useLinkProductDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, link, label }: { id: string; link: string; label: string }) => linkProductDocument(id, link, label),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'documents', variables.id] })
    },
  })
}

export function useDeleteProductDocumentLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, linkId }: { id: string; linkId: number }) => deleteProductDocumentLink(id, linkId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'documents', variables.id] })
    },
  })
}

export function useDeleteProductDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      (() => deleteProductDocumentFile(id, filename))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'documents', variables.id] })
    },
  })
}

// Product/Card page's own dashboard AJAX endpoint (product/ajax/product_dashboard.php)
// — a JSON source for the Activity Timeline, Connections (customers who
// bought this product, by invoice count), and Teams (vendors who supply it,
// by supplier-invoice count) panels shown on the Product tab, all in one
// call. Same same-origin session-cookie pattern as UOM Settings above.
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
export interface FapiProductDashboard {
  timeline: Array<{ id: number; ref: string; date: string; amount_formatted: string; customer: string; status: string; status_id: number }>
  timeline_total: number
  timeline_page: number
  timeline_per_page: number
  connections: Array<{ id: number; name: string; connections: string; initials: string }>
  teams: Array<{ id: number; name: string; connections: string; initials: string }>
}
export interface ProductDashboard {
  timeline: ProductTimelineEntry[]
  timelineTotal: number
  timelinePage: number
  timelinePerPage: number
  connections: ProductConnection[]
  teams: ProductConnection[]
}
export function mapProductDashboard(d: FapiProductDashboard): ProductDashboard {
  const conn = (c: { id: number; name: string; connections: string; initials: string }): ProductConnection => ({ id: c.id, name: c.name, connectionsLabel: c.connections, initials: c.initials })
  return {
    timeline: d.timeline.map((t) => ({ ref: t.ref, invoiceId: t.id, date: t.date, amount: t.amount_formatted, customer: t.customer, status: t.status, statusId: t.status_id })),
    timelineTotal: d.timeline_total,
    timelinePage: d.timeline_page,
    timelinePerPage: d.timeline_per_page,
    connections: d.connections.map(conn),
    teams: d.teams.map(conn),
  }
}
export function useProductDashboard(id: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ['products', 'legacy', 'dashboard', id, page],
    // product/fapi/dashboard.php answers the invoice timeline and the connections next to the sales window (replacing the session-only
    // product/ajax/product_dashboard.php); captured from newecuenta on 23 Oct 2026 (tests/fixtures/product-dashboard.json).
    queryFn: async (): Promise<ProductDashboard> => mapProductDashboard(await fapiGet<FapiProductDashboard>('/product/fapi/dashboard.php', { id: id!, page })),
    enabled: !!id,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// product/fapi/dashboard.php — what the product sold and bought over a window:
// validated customer invoice lines (credit notes excluded, so a refund does not read
// as a sale), purchases, open documents and the monthly sales split. It sits above
// the invoice timeline; null on a backend without the endpoint.
export function useProductSalesWindow(id: string | undefined, months = 12) {
  return useQuery({
    queryKey: ['products', 'salesWindow', id, months],
    queryFn: async (): Promise<ProductDashboardData | null> => {
      try {
        return await getProductDashboard(id!, months)
      } catch (error) {
        if (isMissingEndpoint(error)) return null
        throw error
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// =============================================================================
// Hero header actions (Delete / Duplicate) on product/fapi/product.php.

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // product/fapi/product.php refuses (409) when the product is used by a document or holds stock, and says why - so a
      // delete that reports success really happened.
      return deleteProduct(id)
    },
    onSuccess: () => {
      // Only queries that are not on screen reload: the open page is the deleted
      // product's own, and refetching it would just answer 404.
      queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'inactive' })
    },
  })
}

export interface DuplicateProductResult {
  id: number
  ref: string
}
// The new clone endpoint needs the reference for the copy (it never guesses one),
// so the caller passes the original's reference and the copy is "<ref>-COPY".
export function useDuplicateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ref }: { id: string; ref: string }): Promise<DuplicateProductResult> => {
      const copy = await cloneProduct(id, `${ref}-COPY`)
      return { id: copy.id, ref: copy.ref }
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
  // Pending documents behind the virtual stock; null when the source has no breakdown.
  stockDiff: RawStockView['stock_diff'] | null
  warehouses: { id: number; ref: string; place: string; units: number; pmp: string; valuePurchase: string; sellPriceMin: string; valueSell: string }[]
  totals: { totalQty: number; avgPmp: string; totalValuePurchase: string; avgSellPrice: string; totalValueSell: string }
  movements: { id: number; dateFormatted: string; qty: number; label: string; warehouse: string; user: string }[]
  warehouseOptions: { value: string; label: string }[]
  hasBatch: boolean
  canStock: boolean
  canEdit: boolean
}

// product/fapi/stock.php — levels, per-warehouse rows and the last 50 movements. It
// has no price block, so prices.php (selling, minimum and cost price) and
// suppliers.php (cheapest buying price) fill the tab's pricing card, and warehouse
// values are quantity x price, as product/stock/product.php computes them. It has no
// pending-documents breakdown either: stockDiff is null and that panel stays hidden.
async function fetchProductStockOverview(id: string): Promise<ProductStockOverview> {
  const [s, prices, suppliers] = await Promise.all([getProductStock(id), getProductPrices(id).catch(() => null), getProductSuppliers(id).catch(() => null)])
  const money = (n: number | null | undefined) => (n === null || n === undefined ? '' : `${formatMoney(n)}${s.currency ? ` ${s.currency}` : ''}`)
  // A product priced in TTC shows its TTC selling and minimum price, tagged "Inc. Tax", like the classic stock tab.
  const ttc = prices?.current.price_base_type === 'TTC'
  const taxed = (n: number | null | undefined) => (n === null || n === undefined ? '' : `${money(n)}${ttc ? ' Inc. Tax' : ''}`)
  const sell = prices ? (ttc ? prices.current.price_ttc : prices.current.price) : null
  const { alert, desired } = s.totals
  return {
    pricing: {
      costPrice: money(prices?.current.cost_price),
      pmp: money(s.totals.pmp),
      buyingPriceMin: suppliers?.best ? money(suppliers.best.unit_price) : '',
      sellingPrice: taxed(sell),
      minPrice: taxed(prices ? (ttc ? prices.current.price_min_ttc : prices.current.price_min) : null),
    },
    stockAlertThreshold: alert ? String(alert) : '',
    desiredStock: desired ? String(desired) : '',
    physicalStock: s.totals.real,
    virtualStock: s.totals.virtual,
    physicalBelowLimit: alert > 0 && s.totals.real < alert,
    virtualBelowLimit: alert > 0 && s.totals.virtual < alert,
    lastMovement: s.movements[0]?.date ?? null,
    stockDiff: null,
    warehouses: s.warehouses.map((w) => ({
      id: w.id,
      ref: w.ref,
      place: w.location,
      units: w.real,
      pmp: money(w.pmp),
      valuePurchase: money(w.real * w.pmp),
      sellPriceMin: money(sell),
      valueSell: sell === null ? '' : money(w.real * sell),
    })),
    totals: {
      totalQty: s.totals.real,
      avgPmp: money(s.totals.pmp),
      totalValuePurchase: money(s.totals.value_pmp),
      avgSellPrice: money(sell),
      totalValueSell: sell === null ? '' : money(s.totals.real * sell),
    },
    movements: s.movements.map((m) => ({ id: m.id, dateFormatted: m.date, qty: m.qty, label: m.label, warehouse: m.warehouse, user: m.by })),
    warehouseOptions: s.options.warehouses.map((w) => ({ value: String(w.id), label: w.location && w.location !== w.ref ? `${w.ref} (${w.location})` : w.ref })),
    hasBatch: s.options.batch_enabled,
    canStock: s.options.can_write,
    canEdit: s.options.can_write,
  }
}

export function useProductStockOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'stockOverview', id],
    queryFn: (): Promise<ProductStockOverview> => (() => fetchProductStockOverview(id!))(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}


// Inline-editable Stock Alert Threshold / Desired Stock fields (matches the
// real page's own onchange-save inputs, see productinfo_stock.js).
export function useSetStockField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: 'seuil_stock_alerte' | 'desiredstock'; value: string }) =>
      (() => {
          // stock.php's set_limits takes both limits: the one not being edited is
          // sent with its current value so saving one never clears the other.
          const current = queryClient.getQueryData<ProductStockOverview>(['products', 'detail', 'stockOverview', id])
          const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Number(v))
          return setProductStockLimits(id, {
            stock_alert: num(field === 'seuil_stock_alerte' ? value : current?.stockAlertThreshold),
            desired_stock: num(field === 'desiredstock' ? value : current?.desiredStock),
          })
        })(),
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
  batchNumber: string
}
export function useCorrectStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CorrectStockInput) =>
      (() =>
          correctProductStock({
            id: Number(input.id),
            warehouse_id: Number(input.warehouseId),
            qty: Number(input.qty),
            movement: input.mouvement === '1' ? 1 : 0,
            label: input.label,
            unitprice: input.unitPrice.trim() === '' ? undefined : Number(input.unitPrice),
            batch_number: input.batchNumber || undefined,
          }))(),
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
  batchNumber: string
}
export function useTransferStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TransferStockInput) =>
      (() =>
          transferProductStock({
            id: Number(input.id),
            warehouse_from: Number(input.warehouseFrom),
            warehouse_to: Number(input.warehouseTo),
            qty: Number(input.qty),
            label: input.label,
            batch_number: input.batchNumber || undefined,
          }))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'stockOverview', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
    },
  })
}

export interface ProductUomOverview {
  baseUnitLabel: string
  conversionsCount: number
  // Stock on hand in the base unit, e.g. "0.00 mm" (the classic UOM tab's "Available stock").
  availableStock: string
  productBarcode: string
  hasBatchTracking: boolean
  conversions: { id: number; packingUnitId: number; packingLabel: string; uomUnitId: number; uomLabel: string; factor: number; priceOverrideTtc: number; purchasePriceTtc: number | null; sellingPriceTtc: number | null; barcode: string; note: string; isDefault: boolean }[]
  packingUnitOptions: { value: string; label: string }[]
  uomUnitOptions: { value: string; label: string }[]
  canEdit: boolean
}
// product/fapi/uom.php — conversions through ProductUomManager. It has no product
// barcode or batch flag, so get.php (barcode) and stock.php (batch tracking) add
// them. Its uom_units list already includes the packing units (unit_type "pack"),
// so it alone is the system-wide unit count.
async function fetchProductUomOverview(id: string): Promise<ProductUomOverview> {
  const [u, card, stock] = await Promise.all([
    getProductUom(id),
    getProduct(id, { withStock: false, withPrices: false }).catch(() => null),
    getProductStock(id).catch(() => null),
  ])
  const unitOption = (o: { value: string; label: string; code: string }) => ({ value: String(o.value), label: `${o.label} (${o.code})` })
  const base = u.options.base_unit
  return {
    baseUnitLabel: base?.label || base?.code || '—',
    conversionsCount: u.conversions.length,
    availableStock: stock ? `${Number(stock.totals.real).toFixed(2)}${base?.short_label ? ` ${base.short_label}` : ''}` : '—',
    productBarcode: typeof card?.product.barcode === 'string' ? card.product.barcode : '',
    hasBatchTracking: !!stock?.options.batch_enabled,
    conversions: u.conversions.map((c) => ({
      id: c.id,
      packingUnitId: c.packing_unit_id,
      packingLabel: c.packing_label,
      uomUnitId: c.uom_unit_id,
      uomLabel: c.uom_label,
      factor: c.factor,
      priceOverrideTtc: c.price_override_ttc,
      purchasePriceTtc: c.purchase_price_ttc ?? null,
      sellingPriceTtc: c.selling_price_ttc ?? null,
      barcode: c.barcode,
      note: c.note,
      isDefault: c.is_default,
    })),
    packingUnitOptions: u.options.packing_units.map(unitOption),
    uomUnitOptions: u.options.uom_units.map(unitOption),
    canEdit: u.options.can_write,
  }
}

export function useProductUomOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'uomOverview', id],
    queryFn: (): Promise<ProductUomOverview> => (() => fetchProductUomOverview(id!))(),
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
    mutationFn: (input: SaveUomConversionInput) =>
      (() =>
          saveProductUomConversion({
            id: Number(input.id),
            conv_id: input.convId,
            packing_unit: Number(input.packingUnit),
            uom_unit: Number(input.uomUnit),
            factor: Number(input.factor),
            barcode: input.barcode,
            is_default: input.isDefault ? 1 : 0,
            price_override_ttc: input.priceTtc.trim() === '' ? 0 : Number(input.priceTtc),
            note: input.note,
          }))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', variables.id] })
    },
  })
}

// The product's own barcode is a product field: product.php's update stores it.
export function useSaveProductBarcode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, barcode }: { id: string; barcode: string }) =>
      (() => updateProduct(id, { barcode }))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
    },
  })
}

// Generates the PRODUCT's own barcode: product/fapi/uom.php?action=generate_product_barcode (the plain
// generate_barcode there fills a packing conversion's). Another product already holding the barcode is a 409
// naming the owner; the older productinfo/api/uom_api.php stays as the fallback on a backend without the action.
export function useGenerateProductBarcode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      (() => generateProductBarcode(Number(id)))(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] })
    },
  })
}

// product/fapi/uom.php?action=enable_batch | disable_batch: the Stock and UOM tabs both need tracking on before they can
// offer a lot. Both tabs read the flag from stock.php's options, so both refresh.
export function useSetBatchTracking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setProductBatchTracking(id, enabled),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'stockOverview', id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] })
    },
  })
}

export function useDeleteUomConversion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, convId }: { id: string; convId: number }) =>
      (() => deleteProductUomConversion(id, convId))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'uomOverview', variables.id] })
    },
  })
}

export interface ProductSupplierOverview {
  suppliersCount: number
  bestUnitPrice: number | null
  avgUnitPrice: number | null
  costPrice: number
  pmp: number
  bestPriceSupplierName: string | null
  suppliers: { rowid: number; supplierName: string; refFourn: string; unitPrice: number; priceHt: number; currency: string; quantity: number; vatRate: string; deliveryDays: number | null; reputation: string }[]
}
// product/fapi/suppliers.php — rows ordered by unit price, `best` = the cheapest.
async function fetchProductSupplierOverview(id: string): Promise<ProductSupplierOverview> {
  const d = await getProductSuppliers(id)
  const prices = d.prices.map((s) => s.unit_price).filter((p) => p > 0)
  return {
    suppliersCount: d.prices.length,
    bestUnitPrice: d.best?.unit_price ?? null,
    avgUnitPrice: prices.length ? prices.reduce((sum, p) => sum + p, 0) / prices.length : null,
    costPrice: d.cost_price,
    pmp: d.pmp,
    bestPriceSupplierName: d.best?.supplier ?? null,
    suppliers: d.prices.map((s) => ({
      rowid: s.id,
      supplierName: s.supplier,
      refFourn: s.ref_fourn,
      unitPrice: s.unit_price,
      priceHt: s.price,
      currency: s.currency || '',
      quantity: s.qty,
      vatRate: String(s.tva_tx),
      deliveryDays: s.delivery_days ?? null,
      reputation: '',
    })),
  }
}

export function useProductSupplierOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'supplierOverview', id],
    queryFn: (): Promise<ProductSupplierOverview> => (() => fetchProductSupplierOverview(id!))(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}


// =============================================================================
// Edit wizard — product/fapi/edit_form.php (current values, every dropdown and the write
// contract in one call) and product/fapi/product.php?action=update (only the changed fields).
export function useProductEditForm(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'editForm', id],
    queryFn: () => getProductEditForm(id!),
    enabled: !!id,
    staleTime: 0,
    retry: false,
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: ProductWriteFields }) => {
      if (Object.keys(fields).length === 0) return {}
      return updateProduct(id, fields)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'editForm', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// =============================================================================
// Selling Prices tab — the view stays on productinfo/api/price_api.php: its ZRA
// IPL / tourism-levy / excise categories and amounts (and the option lists the
// update form needs for them) are not in product/fapi/prices.php. Deleting a
// history line goes through prices.php?action=delete_log, and a price update
// without ZRA categories through prices.php?action=update (see below).
// price_api.php's view replicates
// product/price.php's standard (non-multiprice) view — confirmed
// live this deployment has neither PRODUIT_MULTIPRICES nor
// PRODUIT_CUSTOMER_PRICES_BY_QTY enabled, same single-price shape every
// other price field in this app already assumes.
export interface ProductPriceOverview {
  vatDisplay: string
  sellingPrice: number
  minPrice: number
  price: number
  priceTtc: number
  priceMin: number
  priceMinTtc: number
  priceBaseType: string
  defaultVatCode: string
  zraEnabled: boolean
  zra: { label: string; amount: number; code: string }[]
  priceLog: { rowid: number; dateStr: string; price: number; priceTtc: number; priceBaseType: string; priceMin: number; priceMinTtc: number; vatDisplay: string; userName: string }[]
  canDelete: boolean
  canCreate: boolean
  isVariant: boolean
  // VAT categories from product/fapi/prices.php (rate + code, no markup to read), or
  // null when this backend has no such endpoint. Used for the price update when ZRA
  // tax categories are not in play.
  fapiVatRates: { value: string; label: string; rate: number; code: string; selected: boolean }[] | null
  // The three ZRA levies with their categories (product/fapi/prices.php zra block), or null on an older backend.
  fapiZra: ProductZraLevies | null
}
// product/fapi/prices.php: the current prices, the VAT categories (rate + code), the price history and the ZRA levies
// with their categories, in one call; get.php answers the delete / edit rights. ("16%(A)" is built here from the rate
// and its code.)
export function useProductPriceOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'priceOverview', id],
    queryFn: async (): Promise<ProductPriceOverview> => {
      const [prices, card] = await Promise.all([getProductPrices(id!), getProduct(id!, { withStock: false, withPrices: false }).catch(() => null)])
      const cur = prices.current
      const seenVat = new Set<string>()
      const fapiVatRates = prices.options.vat_rates
        .filter((v) => (seenVat.has(`${v.rate}|${v.code}`) ? false : (seenVat.add(`${v.rate}|${v.code}`), true)))
        .map((v) => ({
          value: `${v.rate}|${v.code}`,
          label: `${v.rate}%${v.code ? ` (${v.code})` : ''}`,
          rate: v.rate,
          code: v.code,
          selected: v.rate === cur.tva_tx && v.code === cur.default_vat_code,
        }))
      const zra: ProductPriceOverview['zra'] = []
      const levies = prices.zra?.levies
      if (levies) {
        // The dictionary amount is the truth: a stored levy cannot drift from the category it names.
        if (levies.ipl.code) zra.push({ label: 'IPL category code', amount: levies.ipl.amount, code: levies.ipl.code })
        if (levies.tourism_levy.code) zra.push({ label: 'TL category code', amount: levies.tourism_levy.amount, code: levies.tourism_levy.code })
        if (levies.excise.code) zra.push({ label: 'Excise tax category code', amount: levies.excise.amount, code: levies.excise.code })
      }
      const vatDisplay = (rate: number, code: string) => `${rate}%${code ? `(${code})` : ''}`
      const baseTtc = cur.price_base_type === 'TTC'
      return {
        vatDisplay: vatDisplay(cur.tva_tx, cur.default_vat_code),
        sellingPrice: Number(baseTtc ? cur.price_ttc : cur.price) || 0,
        minPrice: Number(baseTtc ? cur.price_min_ttc : cur.price_min) || 0,
        price: Number(cur.price) || 0,
        priceTtc: Number(cur.price_ttc) || 0,
        priceMin: Number(cur.price_min) || 0,
        priceMinTtc: Number(cur.price_min_ttc) || 0,
        priceBaseType: cur.price_base_type,
        defaultVatCode: cur.default_vat_code ?? '',
        zraEnabled: Boolean(prices.zra?.enabled),
        zra,
        priceLog: prices.history.map((h) => ({
          rowid: h.id,
          dateStr: h.date,
          price: h.price,
          priceTtc: h.price_ttc,
          priceBaseType: h.base_type,
          priceMin: h.price_min,
          priceMinTtc: h.price_min,
          vatDisplay: vatDisplay(h.tva_tx, h.default_vat_code),
          userName: h.by,
        })),
        canDelete: card ? Boolean(card.can?.delete) : false,
        canCreate: card ? Boolean(card.can?.edit) : false,
        isVariant: false,
        fapiVatRates,
        fapiZra: prices.zra ?? null,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useDeletePriceLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, lineId }: { id: string; lineId: number }) =>
      (() => deleteProductPriceLog(id, lineId))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'priceOverview', variables.id] })
    },
  })
}

export interface UpdateProductPriceInput {
  id: string
  price: string
  priceMin: string
  priceBaseType: string
  tvaTx: string
  iplCatCd: string
  tlCatCd: string
  exciseTxCatCd: string
  // The VAT category, saved through product/fapi/prices.php, which keeps the VAT category code and the price history.
  fapi?: { vatRate: number; vatCode: string }
  // ZRA levy categories (product/fapi/prices.php?action=update_zra), a separate action on purpose: a levy is not a price change and writes no price-history row.
  levies?: { ipl_code: string; tourism_levy_code: string; excise_code: string }
}
export function useUpdateProductPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProductPriceInput) => {
      const [rate, code] = input.fapi ? [input.fapi.vatRate, input.fapi.vatCode] : [Number(input.tvaTx.split('|')[0]) || 0, input.tvaTx.split('|')[1] ?? '']
      const priced = await updateProductPrice({
        id: Number(input.id),
        price: Number(input.price),
        price_min: Number(input.priceMin),
        price_base_type: input.priceBaseType === 'TTC' ? 'TTC' : 'HT',
        tva_tx: rate,
        default_vat_code: code,
      })
      if (input.levies) await updateProductZraLevies(Number(input.id), input.levies)
      return priced
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'priceOverview', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.id] })
    },
  })
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
    // null when the source does not say (product/fapi/variants.php's child has no tobuy).
    forPurchase: boolean | null
    variationPrice: number
    // price_impact is a percentage of the parent price when true, an amount otherwise
    variationIsPercent: boolean
    weightImpact: number
    attributes: { label: string; value: string }[]
  }[]
  totalValues: number
  canEdit: boolean
  canDelete: boolean
}

// product/fapi/variants.php — combinations through ProductCombination, each owning
// a real child product. 501 (with a message) when the variants module is off.
async function fetchProductVariantOverview(id: string): Promise<ProductVariantOverview> {
  const d = await getProductVariants(id)
  const attributes = d.options.attributes
  return {
    attributes: attributes.map((a) => ({ id: a.id, label: a.label, values: a.values.map((v) => ({ id: v.id, value: v.value })) })),
    combinations: d.combinations.map((c) => ({
      id: c.id,
      childId: c.child.id,
      ref: c.child.ref,
      label: c.child.label,
      priceTtc: c.child.price_ttc,
      stock: c.child.stock,
      forSale: c.child.tosell === 1,
      forPurchase: c.child.tobuy === undefined ? null : c.child.tobuy === 1,
      variationPrice: c.price_impact,
      variationIsPercent: c.price_impact_is_percent,
      weightImpact: c.weight_impact,
      attributes: c.values.map((v) => ({ label: v.attribute_label, value: v.value_label })),
    })),
    totalValues: attributes.reduce((sum, a) => sum + a.values.length, 0),
    canEdit: d.options.can_write,
    canDelete: d.options.can_write,
  }
}


export function useProductVariantOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'variantOverview', id],
    queryFn: (): Promise<ProductVariantOverview> => (() => fetchProductVariantOverview(id!))(),
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
    mutationFn: (input: CreateCombinationInput) =>
      (() =>
          createProductCombination({
            id: Number(input.id),
            // "attrId-valueId" pairs -> { attrId: valueId }
            values: Object.fromEntries(input.features.map((f) => f.split('-')).map(([attr, value]) => [attr, Number(value)])),
            price_impact: Number(input.priceImpact) || 0,
            price_impact_is_percent: input.priceImpactPercent,
            weight_impact: Number(input.weightImpact) || 0,
            reference: input.reference || undefined,
          }))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'variantOverview', variables.id] })
    },
  })
}


export function useDeleteCombination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, combinationId }: { id: string; combinationId: number }) =>
      (() => deleteProductCombination(id, combinationId))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'variantOverview', variables.id] })
    },
  })
}

export interface ProductCompositionOverview {
  natureLabel: string
  priceDisplay: string
  parents: { id: number; ref: string; label: string; qty: number }[]
  compositions: { id: number; ref: string; label: string; qty: number; stock: number; buyPrice: number; buyDefined: boolean; sellPrice: number | null; incdec: boolean; forSale: boolean }[]
  totalBuy: number
  totalSell: number
  canEdit: boolean
}
// product/fapi/composition.php — the kit's children and the kits it belongs to.
// It has no buying prices, so each child's cheapest supplier price
// (suppliers.php `best`, what the old tab showed) is fetched alongside; the
// product's nature comes from the product detail the page has already loaded.
async function fetchProductCompositionOverview(id: string, finished: number | undefined): Promise<ProductCompositionOverview> {
  const d = await getProductComposition(id)
  const buyPrices = await Promise.all(d.children.map((c) => getProductSuppliers(c.id).then((s) => s.best?.unit_price ?? null).catch(() => null)))
  const compositions = d.children.map((c, i) => ({
    id: c.id,
    ref: c.ref,
    label: c.label,
    qty: c.qty,
    stock: c.stock,
    buyPrice: buyPrices[i] ?? 0,
    buyDefined: buyPrices[i] !== null,
    sellPrice: c.price,
    // 1 = the parent's stock moves with the sub-product's
    incdec: c.incdec === 1,
    forSale: c.tosell === 1,
  }))
  return {
    natureLabel: NATURE_OPTIONS.find((o) => o.value === String(finished ?? ''))?.label ?? 'Not defined',
    priceDisplay: '',
    parents: d.parents.map((p) => ({ id: p.id, ref: p.ref, label: p.label, qty: p.qty })),
    compositions,
    totalBuy: compositions.reduce((sum, c) => sum + (c.buyDefined ? c.buyPrice * c.qty : 0), 0),
    totalSell: compositions.reduce((sum, c) => sum + (c.sellPrice ?? 0) * c.qty, 0),
    canEdit: d.can_write,
  }
}


export function useProductCompositionOverview(id: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['products', 'detail', 'compositionOverview', id],
    queryFn: (): Promise<ProductCompositionOverview> => {
      const finished = queryClient.getQueryData<ProductDetail>(['products', 'detail', id])?.finished
      return (() => fetchProductCompositionOverview(id!, finished))()
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useAddSubproduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, childId, qty, incdec }: { id: string; childId: string; qty: string; incdec: boolean }) =>
      (() => saveProductCompositionChild({ id: Number(id), child_id: Number(childId), qty: Number(qty), incdec: incdec ? 1 : 0 }))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'compositionOverview', variables.id] })
    },
  })
}

export function useDeleteSubproduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, childId }: { id: string; childId: number }) =>
      (() => deleteProductCompositionChild(id, childId))(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', 'compositionOverview', variables.id] })
    },
  })
}

export interface ProductStatsOverview {
  // The window the figures cover, for the tiles' captions.
  periodLabel: string
  totalSales: number
  totalPurchase: number
  qtySold: number
  marginPct: number
  // purchase is null when the source has no monthly purchase split.
  monthly: { month: string; sales: number; purchase: number | null; qty: number }[]
  topCustomers: { id: number; name: string; qty: number; total: number }[]
}

// product/fapi/stats.php — scope=invoice gives sales (validated standard invoices,
// credit notes kept apart as refunds) by month and by customer; the default scope
// gives per-document totals, whose vendor invoices are the purchases. Both are
// all-time, and there is no monthly purchase split.
async function fetchProductStatsOverview(id: string): Promise<ProductStatsOverview> {
  const [sales, all] = await Promise.all([getProductInvoiceStats(id), getProductStats(id)])
  const totalSales = sales.invoices.amount_ht
  const totalPurchase = all.by_document.supplier_invoices?.amount_ht ?? 0
  return {
    periodLabel: 'All time',
    totalSales,
    totalPurchase,
    qtySold: sales.invoices.qty,
    marginPct: totalSales > 0 ? ((totalSales - totalPurchase) / totalSales) * 100 : 0,
    monthly: [...sales.by_month].sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({ month: m.month, sales: m.amount_ht, purchase: null, qty: m.qty })),
    topCustomers: [...sales.by_customer].sort((a, b) => b.amount_ht - a.amount_ht).map((c) => ({ id: c.id, name: c.name, qty: c.qty, total: c.amount_ht })),
  }
}


export function useProductStatsOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'statsOverview', id],
    queryFn: (): Promise<ProductStatsOverview> => (() => fetchProductStatsOverview(id!))(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// =============================================================================
// Notes tab — product/fapi/notes.php (fallback productinfo/api/note_api.php,
// which replaced the old api/products/?action=update-note, unrouted on this
// backend — see BACKEND_ACTION_UNAVAILABLE_PREFIX's own note elsewhere in this file).
export function useProductNotesOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'notes', id],
    queryFn: (): Promise<{ notePublic: string; notePrivate: string }> =>
      (async () => {
          const d = await getProductNotes(id!)
          return { notePublic: d.note_public ?? '', notePrivate: d.note_private ?? '' }
        })(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useSaveProductNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    // only the note that was sent is written (notes.php leaves the other as it is)
    mutationFn: ({ id, notePublic, notePrivate }: { id: string; notePublic?: string; notePrivate?: string }) =>
      saveProductNotes(id, { ...(notePublic !== undefined ? { note_public: notePublic } : {}), ...(notePrivate !== undefined ? { note_private: notePrivate } : {}) }),
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
  // the agenda event type: AC_PRODUCT_MODIFY marks a recorded modification of the product
  typeCode: string
  label: string
  date: string
  dateEnd: string | null
  typeLabel: string
  userName: string
  percent: number
  status: 'success' | 'warning' | 'info' | 'secondary'
}
export interface ProductAgenda {
  events: ProductAgendaEvent[]
  createdBy: string
  creationDate: string
  latestModificationDate: string
}
export function useProductAgendaEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', 'agendaEvents', id],
    queryFn: async (): Promise<ProductAgenda> => {
      // product/fapi/agenda.php: each event's progress (percent, -1 = automatic event) and status text; the badge is derived from them.
      const d = await getProductAgenda(id!)
      return {
        createdBy: d.created_by,
        creationDate: d.creation_date,
        latestModificationDate: d.latest_modification_date,
        events: d.events.map((e) => ({
          id: e.id,
          typeCode: e.type_code,
          label: e.label,
          date: e.date,
          dateEnd: e.date_end || null,
          typeLabel: e.percent < 0 ? 'Automatic' : e.status_label,
          userName: e.owner,
          percent: e.percent,
          status: e.percent < 0 ? 'secondary' : e.percent >= 100 ? 'success' : e.percent > 0 ? 'info' : 'warning',
        })),
      }
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export interface InvoiceStatsReferer {
  label: string
  icon: string
  // null when the source does not count distinct third parties for that document type.
  nbThirdparties: number | null
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
// The document types product/fapi/stats.php totals, as the Related Items table names them.
const REFERER_LABELS = [
  ['proposals', 'Quotations'],
  ['orders', 'Sales orders'],
  ['invoices', 'Customer invoices'],
  ['supplier_orders', 'Purchase orders'],
  ['supplier_invoices', 'Vendor invoices'],
  ['contracts', 'Contracts'],
] as const

// product/fapi/stats.php returns every invoice line at once (scope=invoice) plus
// per-document totals (default scope), so the month / year filter and the paging
// happen here. Dates arrive as MM/DD/YYYY.
export function buildProductInvoiceStats(
  sales: ProductInvoiceStatsData,
  documents: Awaited<ReturnType<typeof getProductStats>>,
  page: number,
  month: number,
  year: number,
  pageSize: number,
): ProductInvoiceStats {
  const dated = sales.lines.map((line) => {
    const m = line.date.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    return { line, month: m ? Number(m[1]) : 0, year: m ? Number(m[3]) : 0 }
  })
  const filtered = dated.filter((d) => (!month || d.month === month) && (!year || d.year === year)).map((d) => d.line)
  return {
    referers: REFERER_LABELS.flatMap(([key, label]) => {
      const d = documents.by_document[key]
      if (!d?.available) return []
      return [{ label, icon: '', nbThirdparties: key === 'invoices' ? sales.by_customer.length : null, nbObjects: String(d.count), qty: String(d.qty) }]
    }),
    invoices: filtered.slice(page * pageSize, (page + 1) * pageSize).map((l) => ({
      id: l.invoice_id,
      ref: l.ref,
      companyId: 0,
      company: l.customer,
      customerCode: '',
      date: l.date,
      qty: l.qty,
      totalHT: l.total_ht,
      totalFormatted: formatMoney(l.total_ht),
      status: l.paid === 1 ? 'Paid' : 'Unpaid',
      statusClass: l.paid === 1 ? 'success' : 'warning',
      paymentPct: l.paid === 1 ? 100 : 0,
      paid: l.paid === 1 ? l.total_ttc : 0,
      isCreditNote: l.is_credit_note,
    })),
    totalHT: filtered.reduce((sum, l) => sum + l.total_ht, 0),
    totalQty: filtered.reduce((sum, l) => sum + l.qty, 0),
    totalRecords: filtered.length,
    years: Array.from(new Set(dated.map((d) => d.year).filter(Boolean))).sort((a, b) => b - a),
    currentPage: page,
    pageSize,
    currentMonth: month,
    currentYear: year,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

export function useProductInvoiceStats(id: string | undefined, page: number = 0, month: number = 0, year: number = 0, pageSize: number = 20) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['products', 'detail', 'invoiceStats', id, page, month, year, pageSize],
    queryFn: (): Promise<ProductInvoiceStats> =>
      (async () => {
          // Fetched once per product; changing page / month / year re-slices it.
          const [sales, documents] = await queryClient.fetchQuery({
            queryKey: ['products', 'detail', 'invoiceStatsSource', id],
            queryFn: () => Promise.all([getProductInvoiceStats(id!), getProductStats(id!)]),
            staleTime: 1000 * 30,
          })
          return buildProductInvoiceStats(sales, documents, page, month, year, pageSize)
        })(),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

