/**
 * Centralized Product API client — the endpoints under product/fapi/: the product
 * area (summary, list, card, search, form options, ZRA classification, CRUD, prices,
 * dashboard, categories) and the detail tabs (stock, UOM, suppliers, variants,
 * composition, margins, statistics, notes, documents, agenda).
 *
 * Bearer-token (X-API-Key) JSON endpoints that wrap the Dolibarr Product class.
 * Every response uses one envelope: { success, data, message, errors }. These
 * endpoints exist on the backend branch that ships product/fapi; an older
 * backend answers 404, which isMissingEndpoint() lets callers detect so they can
 * fall back to the legacy source instead of breaking the page.
 */

import axios from 'axios'
import { fapi } from './axios'

// ── Envelope ───────────────────────────────────────────────────

interface Envelope<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown[] | Record<string, unknown> | null
}

function errorText(body: Partial<Envelope<unknown>> | undefined, fallback: string): string {
  if (body?.message) return body.message
  const errors = body?.errors
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join(' ')
  if (errors && typeof errors === 'object') return Object.values(errors).map(String).join(' ')
  return fallback
}

/** True when the backend simply doesn't have product/fapi (404/405 on the route). */
export function isMissingEndpoint(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  // A 404 that carries the envelope ("Product not found") is a real answer, not a missing route.
  const body = error.response?.data as Partial<Envelope<unknown>> | string | undefined
  const hasEnvelope = typeof body === 'object' && body !== null && 'success' in body
  return (status === 404 || status === 405) && !hasEnvelope
}

async function call<T>(request: Promise<{ data: Envelope<T> }>, fallback: string): Promise<T> {
  try {
    const { data: body } = await request
    if (!body || typeof body !== 'object' || !('success' in body)) throw new Error(fallback)
    if (!body.success) throw new Error(errorText(body, fallback))
    return body.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as Partial<Envelope<unknown>> | undefined
      if (body && typeof body === 'object' && 'success' in body) throw new Error(errorText(body, fallback))
    }
    throw error
  }
}

// ── Types ──────────────────────────────────────────────────────

export interface ProductSummaryData {
  currency: string
  counts: { total: number; products: number; services: number; to_sell: number; to_buy: number; not_for_sale: number }
  stock: { tracked: number; out_of_stock: number; below_alert: number; total_units: number; stock_value_pmp: number }
  zra: { registered: number; pending: number; failed: number; unclassified: number }
  categories: number
  recent: { id: number; ref: string; label: string; date_creation: string }[]
}

export interface ProductZra {
  code: string
  status: string
  id: string
  classification: string
  ipl_cat_code: string
  tl_cat_code: string
  excise_cat_code: string
  registered: boolean
}

export interface ProductCategoryRef {
  id: number
  label: string
  color: string
}

export interface ProductListItem {
  id: number
  ref: string
  label: string
  description: string
  type: number
  type_label: string
  barcode: string
  tosell: number
  tobuy: number
  price: number
  price_ttc: number
  price_base_type: string
  tva_tx: number
  default_vat_code: string
  rrp: number
  cost_price: number
  pmp: number
  stock: number
  stock_alert: number
  desired_stock: number
  total_reserved: number
  /** Lot / serial tracking: 0 off, 1 lot, 2 serial (llx_product.tobatch). */
  tobatch?: number
  /** The backend's label for `tobatch`, e.g. "Disabled". */
  lot_status?: string
  stock_state: string
  weight: number | null
  weight_units: string
  unit: { id: number; code: string; label: string }
  country: { id: number; code: string; label: string }
  zra: ProductZra
  categories: ProductCategoryRef[]
  date_creation: string
  date_update: string
}

export interface ProductPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface ProductListParams {
  search?: string
  /** 0 = products, 1 = services */
  type?: 0 | 1
  tosell?: 0 | 1
  tobuy?: 0 | 1
  category?: number
  zrastatus?: string
  stock?: 'low' | 'zero'
  sort?: 'ref' | 'label' | 'price' | 'stock' | 'created' | 'updated'
  direction?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ProductListData {
  items: ProductListItem[]
  pagination: ProductPagination
}

export interface ProductGetData {
  product: Record<string, unknown> & { id: number; ref: string; label: string }
  zra: Pick<ProductZra, 'code' | 'status' | 'id' | 'classification' | 'registered'>
  categories: ProductCategoryRef[]
  extrafields: Record<string, unknown>
  photo: string | null
  prices: { price: number; price_ttc: number; multiprices_enabled: boolean; levels: unknown[] }
  stock: { real: number; virtual: number; alert: number; desired: number; by_warehouse: unknown[] }
  can: { edit: boolean; delete: boolean }
}

export interface ProductSearchItem {
  id: number
  ref: string
  label: string
  barcode: string
  type: number
  price: number
  price_ttc: number
  tva_tx: number
  default_vat_code: string
  stock: number | null
  unit: string
  zra_registered: boolean
  zra_classified: boolean
}

export interface ProductSearchData {
  query: string
  mode: string
  items: ProductSearchItem[]
  count: number
}

export interface ProductFormOptionsData {
  types: { value: string; label: string; code: string }[]
  units: { value: string; label: string; code: string; short_label: string; unit_type: string; scale: string }[]
  categories: { id: number; label: string; parent: number }[]
  countries: { value: string; label: string; code?: string }[]
  vat_rates: { value: string; rate: number; code: string }[]
  price_base_types: string[]
  defaults: Record<string, unknown>
  zra: Record<string, unknown>
}

export interface ZraClassificationItem {
  code: string
  label: string
  level: number | string
  tax_type: string
  major_target: string
  in_use: string
  active: number
}

export interface ZraClassificationData {
  query: string
  mode: string
  items: ZraClassificationItem[]
  count: number
  total_matched: number
  truncated: boolean
}

export interface ProductWriteFields {
  ref?: string
  label?: string
  type?: 0 | 1
  price?: number
  price_base_type?: 'HT' | 'TTC'
  tva_tx?: number
  tosell?: 0 | 1
  tobuy?: 0 | 1
  fk_unit?: number
  stock_alert?: number
  categories?: number[]
  rrp?: number
  itemclassification?: string
  [field: string]: unknown
}

export interface ProductPricesData {
  product: { id: number; ref: string; label: string }
  current: {
    price: number
    price_ttc: number
    price_min: number
    price_min_ttc: number
    price_base_type: string
    tva_tx: number
    default_vat_code: string
    cost_price: number
    pmp: number
    rrp: number
  }
  levels: unknown[]
  history: { id: number; date: string; level: number; price: number; price_ttc: number; price_min: number; base_type: string; tva_tx: number; default_vat_code: string; by: string }[]
  options: { multiprices_enabled: boolean; levels: number; price_base_types: string[]; vat_rates: { value: string; rate: number; code: string }[] }
  // The three ZRA levies (insurance premium, tourism, excise) with their categories; read-only context while ZRA is off.
  zra?: ProductZraLevies
}

export interface ProductLevyOption {
  id: number
  code: string
  label: string
  amount: number
  legacy_value: string
}
export interface ProductLevy {
  label: string
  module_code: number
  code: string
  amount: number
  options: ProductLevyOption[]
}
export interface ProductZraLevies {
  enabled: boolean
  levies: { ipl: ProductLevy; tourism_levy: ProductLevy; excise: ProductLevy }
  note?: string
}

export interface ProductPriceUpdate {
  id: number
  price: number
  price_base_type?: 'HT' | 'TTC'
  tva_tx?: number
  /** The VAT category code (A, B, ...) kept alongside the rate. */
  default_vat_code?: string
  level?: number
  price_min?: number
}

export interface ProductDashboardData {
  product: { id: number; ref: string; label: string }
  currency: string
  window: { months: number; since: string }
  sales: { qty: number; amount: number; invoice_count: number; by_month: { month: string; qty: number; amount: number }[] }
  purchases: { qty: number; amount: number; order_count: number }
  stock_movements: unknown[]
  open_documents: { orders: number; proposals: number; invoices: number }
  suppliers: unknown[]
}

export interface ProductCategory {
  id: number
  label: string
  parent: number
  color: string
  description: string
  product_count: number
  // Epoch seconds and user logins; categories.php returns them since 16 Oct 2026.
  date_creation?: number
  date_modified?: number
  created_by?: string
  modified_by?: string
}

export interface ProductCategoriesData {
  categories: ProductCategory[]
  count: number
  assigned?: number[]
  can_create: boolean
}

// ── Calls ──────────────────────────────────────────────────────

const BASE = '/product/fapi'

export function getProductsSummary() {
  return call<ProductSummaryData>(fapi.get(`${BASE}/summary.php`), 'Could not load the product summary.')
}

export function listProducts(params: ProductListParams = {}) {
  return call<ProductListData>(fapi.get(`${BASE}/list.php`, { params }), 'Could not load the product list.')
}

/** Every page of a filtered list, for screens that show the whole catalogue at once. */
export async function listAllProducts(params: Omit<ProductListParams, 'page' | 'limit'> = {}, pageSize = 500): Promise<ProductListItem[]> {
  const first = await listProducts({ ...params, page: 1, limit: pageSize })
  const items = [...first.items]
  for (let page = 2; page <= first.pagination.pages; page++) {
    items.push(...(await listProducts({ ...params, page, limit: pageSize })).items)
  }
  return items
}

export function getProduct(id: number | string, options: { withStock?: boolean; withPrices?: boolean } = {}) {
  const params: Record<string, string | number> = { id }
  if (options.withStock === false) params.with_stock = 0
  if (options.withPrices === false) params.with_prices = 0
  return call<ProductGetData>(fapi.get(`${BASE}/get.php`, { params }), 'Could not load the product.')
}

export function searchProducts(query: string, options: { warehouse?: number } = {}, signal?: AbortSignal) {
  return call<ProductSearchData>(fapi.get(`${BASE}/search.php`, { params: { q: query, warehouse: options.warehouse }, signal }), 'Product search failed.')
}

export function findProductByBarcode(barcode: string) {
  return call<ProductSearchData>(fapi.get(`${BASE}/search.php`, { params: { barcode } }), 'Barcode lookup failed.')
}

export function getProductFormOptions() {
  return call<ProductFormOptionsData>(fapi.get(`${BASE}/form_options.php`), 'Could not load the product form options.')
}

/** The classification dictionary is ~150,000 rows: a term of at least two characters is required. */
export function searchZraClassification(term: string) {
  return call<ZraClassificationData>(fapi.get(`${BASE}/zra_classification.php`, { params: { q: term } }), 'Classification search failed.')
}

export function getZraClassification(code: string) {
  return call<ZraClassificationData>(fapi.get(`${BASE}/zra_classification.php`, { params: { code } }), 'Could not load the classification.')
}

export function createProduct(fields: ProductWriteFields) {
  return call<{ id: number; ref: string }>(fapi.post(`${BASE}/product.php`, { action: 'create', ...fields }, { params: { action: 'create' } }), 'Could not create the product.')
}

export function updateProduct(id: number | string, fields: ProductWriteFields) {
  return call<{ id: number }>(fapi.post(`${BASE}/product.php`, { action: 'update', id: Number(id), ...fields }, { params: { action: 'update' } }), 'Could not update the product.')
}

export function cloneProduct(id: number | string, ref: string) {
  return call<{ id: number; ref: string; cloned_from: { id: number; ref: string }; zra_carried: boolean }>(
    fapi.post(`${BASE}/product.php`, { action: 'clone', id: Number(id), ref }, { params: { action: 'clone' } }),
    'Could not duplicate the product.',
  )
}

export function deleteProduct(id: number | string) {
  return call<{ id: number }>(fapi.post(`${BASE}/product.php`, { action: 'delete', id: Number(id), confirm: true }, { params: { action: 'delete' } }), 'Could not delete the product.')
}

// What product.php actually stores, checked live against a throwaway product: create keeps
// ref, label, type, barcode, description, tosell, tobuy, price, price_min, price_base_type,
// tva_tx, default_vat_code, rrp, stock_alert, desired_stock, weight, fk_unit, fk_country,
// accountancy_code_sell/buy and itemclassification. Update changes the same list EXCEPT the
// price fields (price, price_min, VAT code), which only prices.php changes. Nature of
// product, dimensions, notes and ZRA registration are not stored by either call.
export function getProductPrices(id: number | string) {
  return call<ProductPricesData>(fapi.get(`${BASE}/prices.php`, { params: { id } }), 'Could not load the selling prices.')
}

export function updateProductPrice(update: ProductPriceUpdate) {
  return call<Record<string, unknown>>(fapi.post(`${BASE}/prices.php`, { action: 'update', ...update }, { params: { id: update.id } }), 'Could not update the price.')
}

export function getProductDashboard(id: number | string, months = 12) {
  return call<ProductDashboardData>(fapi.get(`${BASE}/dashboard.php`, { params: { id, months } }), 'Could not load the product activity.')
}

export function listProductCategories(productId?: number | string) {
  return call<ProductCategoriesData>(fapi.get(`${BASE}/categories.php`, { params: { product: productId } }), 'Could not load the categories.')
}

export function createProductCategory(input: { label: string; parent?: number; color?: string; product?: number }) {
  return call<{ id: number; label: string; attached_to: number | null; categories: number[] }>(
    fapi.post(`${BASE}/categories.php`, { parent: 0, ...input }, { params: { action: 'create' } }),
    'Could not create the category.',
  )
}

export function assignProductCategories(product: number | string, categories: number[]) {
  return call<{ product: number; categories: { id: number; label: string }[] }>(
    fapi.post(`${BASE}/categories.php`, { product: Number(product), categories }, { params: { action: 'assign' } }),
    'Could not assign the categories.',
  )
}

// ── Detail tabs (product/fapi) ───────────
// Older backends answer 404 here (isMissingEndpoint).

export interface ProductRef {
  id: number
  ref: string
  label: string
}

export interface ProductStockData {
  product: ProductRef
  currency: string
  totals: { real: number; virtual: number; alert: number; desired: number; pmp: number; value_pmp: number }
  warehouses: {
    id: number
    ref: string
    location: string
    real: number
    reserved: number
    pmp: number
    alert: number
    desired: number
    batches?: { id: number; batch: string; qty: number; eatby: string; sellby: string }[]
  }[]
  movements: {
    id: number
    date: string
    qty: number
    direction: string
    unit_price: number
    label: string
    inventory_code: string
    lot: string
    warehouse: string
    origin_type: string
    origin_id: number
    by: string
  }[]
  options: { warehouses: { id: number; ref: string; location: string }[]; batch_enabled: boolean; can_write: boolean; eatby_enabled: boolean; sellby_enabled: boolean }
}

export interface ProductStockCorrection {
  id: number
  warehouse_id: number
  qty: number
  /** 0 adds stock, 1 removes it (the legacy convention). */
  movement: 0 | 1
  label: string
  unitprice?: number
  inventorycode?: string
  batch_number?: string
  eatby?: string
}

export interface ProductStockTransfer {
  id: number
  warehouse_from: number
  warehouse_to: number
  qty: number
  label: string
  batch_number?: string
}

export interface ProductUomUnitOption {
  value: string
  label: string
  code: string
  short_label: string
  unit_type?: string
}

export interface ProductUomConversion {
  id: number
  packing_unit_id: number
  packing_code: string
  packing_label: string
  uom_unit_id: number
  uom_code: string
  uom_label: string
  factor: number
  price_override_ttc: number
  purchase_price_ht: number | null
  purchase_price_ttc?: number | null
  selling_price_ht: number | null
  selling_price_ttc?: number | null
  allow_purchase: boolean
  allow_sale: boolean
  is_default: boolean
  is_default_sale: boolean
  allow_decimal_quantity: boolean
  barcode: string
  sku: string
  note: string
}

export interface ProductUomData {
  product: ProductRef
  conversions: ProductUomConversion[]
  options: {
    packing_units: ProductUomUnitOption[]
    uom_units: ProductUomUnitOption[]
    base_unit: { id: number; code: string; label: string; short_label: string } | null
    tva_tx: number
    uom_enabled: boolean
    can_write: boolean
  }
}

export interface ProductUomConversionInput {
  id: number
  /** 0 creates a conversion. */
  conv_id: number
  packing_unit: number
  uom_unit: number
  factor: number
  barcode?: string
  is_default?: 0 | 1
  price_override_ttc?: number
  note?: string
}

export interface ProductSupplierPrice {
  id: number
  socid: number
  supplier: string
  ref_fourn: string
  qty: number
  price: number
  unit_price: number
  tva_tx: number
  delivery_days: number | null
  currency: string
}

export interface ProductSuppliersData {
  product: ProductRef
  currency: string
  /** Ordered by unit price, cheapest first. */
  prices: ProductSupplierPrice[]
  count: number
  best: ProductSupplierPrice | null
  cost_price: number
  pmp: number
}

export interface ProductVariantsData {
  product: ProductRef
  combinations: {
    id: number
    child: { id: number; ref: string; label: string; price: number; price_ttc: number; stock: number; tosell: number; tobuy?: number }
    values: { attribute_id: number; attribute_label: string; value_id: number; value_label: string }[]
    price_impact: number
    price_impact_is_percent: boolean
    weight_impact: number
  }[]
  options: { attributes: { id: number; ref: string; label: string; values: { id: number; ref: string; value: string }[] }[]; can_write: boolean }
}

export interface ProductCombinationInput {
  id: number
  /** attribute id -> value id */
  values: Record<string, number>
  price_impact: number
  price_impact_is_percent: boolean
  weight_impact?: number
  reference?: string
}

export interface ProductCompositionData {
  product: ProductRef
  is_kit: boolean
  children: { id: number; assoc_id: number; ref: string; label: string; qty: number; incdec: number; type: number; price: number; stock: number; tosell: number }[]
  parents: { id: number; ref: string; label: string; qty: number; incdec: number }[]
  can_write: boolean
}

export interface ProductMarginsData {
  product: ProductRef
  currency: string
  year: number
  summary: { qty: number; revenue_ht: number; cost_ht: number; margin: number; margin_rate: number | null; mark_rate: number | null }
  by_month: { month: string; qty: number; revenue_ht: number; cost_ht: number; margin: number; margin_rate: number | null }[]
  lines: {
    invoice_id: number
    ref: string
    date: string
    customer: string
    qty: number
    unit_price: number
    unit_cost: number
    /** recorded_on_line (buy price stamped at sale time) or current_pmp (fallback). */
    cost_source: string
    revenue_ht: number
    cost_ht: number
    margin: number
    margin_rate: number | null
  }[]
  basis: { lines_total: number; lines_with_recorded_cost: number; lines_using_current_pmp: number; current_pmp: number }
}

export interface ProductDocumentStats {
  count: number
  qty: number
  amount_ht: number
  /** false when that module's table is not installed. */
  available: boolean
}

export interface ProductStatsData {
  product: ProductRef
  currency: string
  year: number
  counts: Record<string, number>
  by_document: Partial<Record<'proposals' | 'orders' | 'invoices' | 'supplier_orders' | 'supplier_invoices' | 'contracts', ProductDocumentStats>>
}

export interface ProductInvoiceStatsData {
  product: ProductRef
  currency: string
  year: number
  /** Validated standard invoices only; credit notes are counted as refunds. */
  invoices: { count: number; qty: number; amount_ht: number; amount_ttc: number }
  refunds: { count: number; qty: number; amount_ht: number }
  by_month: { month: string; count: number; qty: number; amount_ht: number }[]
  by_customer: { id: number; name: string; count: number; qty: number; amount_ht: number }[]
  lines: {
    invoice_id: number
    ref: string
    date: string
    customer: string
    type: number
    is_credit_note: boolean
    paid: number
    qty: number
    unit_price: number
    discount_percent: number
    total_ht: number
    total_ttc: number
  }[]
}

export interface ProductNotesData {
  id: number
  ref: string
  note_public: string
  note_private: string
  can_edit: boolean
}

export interface ProductDocumentsData {
  id: number
  files: { name: string; size: number | string; size_raw?: number; date: string; is_image: boolean; url: string; image_url: string }[]
  links: { id: number; label: string; url: string; date: string }[]
  meta: { can_edit: boolean; modulepart: string; count: number }
}

export interface ProductAgendaData {
  product: ProductRef
  created_by: string
  creation_date: string
  latest_modification_date: string
  events: {
    id: number
    ref: string
    url: string
    date: string
    date_end: string
    owner: string
    label: string
    type_code: string
    location: string
    related_object_ref: string
    related_object_url: string
    status_label: string
    /** -1 = not applicable (automatic event), 0..100 = progress. */
    percent: number
  }[]
  count: number
}

function postTab<T>(file: string, action: string, body: Record<string, unknown>, fallback: string) {
  return call<T>(fapi.post(`${BASE}/${file}`, { action, ...body }, { params: { action } }), fallback)
}

export function getProductStock(id: number | string) {
  return call<ProductStockData>(fapi.get(`${BASE}/stock.php`, { params: { id } }), 'Could not load the stock.')
}

export function setProductStockLimits(id: number | string, limits: { stock_alert: number | null; desired_stock: number | null }) {
  return postTab<Record<string, unknown>>('stock.php', 'set_limits', { id: Number(id), ...limits }, 'Could not save the stock limits.')
}

export function correctProductStock(input: ProductStockCorrection) {
  return postTab<Record<string, unknown>>('stock.php', 'correct', { ...input }, 'Could not correct the stock.')
}

export function transferProductStock(input: ProductStockTransfer) {
  return postTab<Record<string, unknown>>('stock.php', 'transfer', { ...input }, 'Could not transfer the stock.')
}

export function getProductUom(id: number | string) {
  return call<ProductUomData>(fapi.get(`${BASE}/uom.php`, { params: { id } }), 'Could not load the unit conversions.')
}

export function saveProductUomConversion(input: ProductUomConversionInput) {
  return postTab<Record<string, unknown>>('uom.php', 'save_conversion', { ...input }, 'Could not save this conversion.')
}

export function deleteProductUomConversion(id: number | string, convId: number) {
  return postTab<Record<string, unknown>>('uom.php', 'delete_conversion', { id: Number(id), conv_id: convId }, 'Could not delete this conversion.')
}

/** Turns lot/batch tracking on or off. Switching it off is refused (409) while lots exist, since they would stay attached to an untracked product. */
export function setProductBatchTracking(id: number | string, enabled: boolean) {
  return postTab<Record<string, unknown>>('uom.php', enabled ? 'enable_batch' : 'disable_batch', { id: Number(id) }, 'Could not change the lot tracking.')
}

export function getProductSuppliers(id: number | string) {
  return call<ProductSuppliersData>(fapi.get(`${BASE}/suppliers.php`, { params: { id } }), 'Could not load the supplier prices.')
}

/** 501 (an envelope, not a missing route) when the variants module is off. */
export function getProductVariants(id: number | string) {
  return call<ProductVariantsData>(fapi.get(`${BASE}/variants.php`, { params: { id } }), 'Could not load the variants.')
}

export function createProductCombination(input: ProductCombinationInput) {
  return postTab<Record<string, unknown>>('variants.php', 'create_combination', { ...input }, 'Could not create the combination.')
}

/** Also deletes the combination's child product (the response names it). */
export function deleteProductCombination(id: number | string, combinationId: number) {
  return postTab<Record<string, unknown>>('variants.php', 'delete_combination', { id: Number(id), combination_id: combinationId }, 'Could not delete this combination.')
}

export function getProductComposition(id: number | string) {
  return call<ProductCompositionData>(fapi.get(`${BASE}/composition.php`, { params: { id } }), 'Could not load the composition.')
}

/** `add` on a child that is already there updates it instead of duplicating it. */
export function saveProductCompositionChild(input: { id: number; child_id: number; qty: number; incdec: 0 | 1 }) {
  return postTab<Record<string, unknown>>('composition.php', 'add', { ...input }, 'Could not add the sub-product.')
}

export function deleteProductCompositionChild(id: number | string, childId: number) {
  return postTab<Record<string, unknown>>('composition.php', 'delete', { id: Number(id), child_id: childId }, 'Could not remove the sub-product.')
}

export function getProductMargins(id: number | string, year?: number) {
  return call<ProductMarginsData>(fapi.get(`${BASE}/margins.php`, { params: { id, year: year || undefined } }), 'Could not load the margins.')
}

export function getProductStats(id: number | string, year?: number) {
  return call<ProductStatsData>(fapi.get(`${BASE}/stats.php`, { params: { id, year: year || undefined } }), 'Could not load the statistics.')
}

export function getProductInvoiceStats(id: number | string, year?: number) {
  return call<ProductInvoiceStatsData>(fapi.get(`${BASE}/stats.php`, { params: { id, scope: 'invoice', year: year || undefined } }), 'Could not load the invoice statistics.')
}

export function getProductNotes(id: number | string) {
  return call<ProductNotesData>(fapi.get(`${BASE}/notes.php`, { params: { id } }), 'Could not load the notes.')
}

/** Writes only the notes sent, so saving one never blanks the other. */
export function saveProductNotes(id: number | string, notes: { note_public?: string; note_private?: string }) {
  return call<Record<string, unknown>>(fapi.post(`${BASE}/notes.php`, { id: Number(id), ...notes }), 'Could not save the notes.')
}

export function getProductDocuments(id: number | string) {
  return call<ProductDocumentsData>(fapi.get(`${BASE}/documents.php`, { params: { id } }), 'Could not load the linked files.')
}

export function uploadProductDocument(id: number | string, file: File) {
  const body = new FormData()
  body.set('id', String(id))
  body.set('file', file)
  return call<Record<string, unknown>>(fapi.post(`${BASE}/documents.php`, body, { params: { action: 'upload' }, timeout: 120000 }), 'Could not upload the file.')
}

export function deleteProductDocumentFile(id: number | string, name: string) {
  return postTab<Record<string, unknown>>('documents.php', 'delete_file', { id: Number(id), name }, 'Could not delete this file.')
}

// documents.php?action=link { id, link, label } adds a URL link; action=delete_link { id, linkid } removes one.
export function linkProductDocument(id: number | string, link: string, label: string) {
  return postTab<Record<string, unknown>>('documents.php', 'link', { id: Number(id), link, label }, 'Could not add the link.')
}

export function deleteProductDocumentLink(id: number | string, linkId: number) {
  return postTab<Record<string, unknown>>('documents.php', 'delete_link', { id: Number(id), linkid: linkId }, 'Could not remove the link.')
}

export function getProductAgenda(id: number | string) {
  return call<ProductAgendaData>(fapi.get(`${BASE}/agenda.php`, { params: { id } }), 'Could not load the events.')
}

/** Needs produit->supprimer; 409 when the line belongs to another product. */
export function deleteProductPriceLog(id: number | string, lineId: number) {
  return postTab<{ id: number; lineid: number }>('prices.php', 'delete_log', { id: Number(id), lineid: lineId }, 'Could not delete this price history line.')
}

// ── Stock views, lots, variant attributes & bulk tools (15 Oct 2026, 2nd batch) ──
// product/stock/fapi (replenishment, stock by lot, stock at a date, lots),
// variants/fapi/attributes.php, and product/fapi's all-products statistics, bulk
// VAT / price tools and tag update / delete. Shapes checked against newecuenta.

const STOCK_BASE = '/product/stock/fapi'

/** Dates in these responses are Unix timestamps (seconds), null when unset. */
export type UnixTime = number | null

export interface ReassortItem {
  id: number
  ref: string
  label: string
  barcode: string
  type: number
  price: number
  price_ttc: number
  price_base_type: string
  pmp: number
  stock_physique: number
  /** null when the call was made with virtual=0. */
  stock_virtual: number | null
  stock_value: number
  stock_limit: number
  desired_stock: number
  to_order: number | null
  below_alert: boolean
  batch_enabled: boolean
  unit: string | null
  to_sell: number
  to_buy: number
  zra: { code: string; status: string; id: string }
  date_modified: UnixTime
}

export interface ReassortParams {
  page?: number
  limit?: number
  type?: 0 | 1
  search_all?: string
  /** -2 = products with no tag. */
  categ?: number
  warehouse?: number
  tosell?: 0 | 1
  tobuy?: 0 | 1
  toolowstock?: 0 | 1
  virtual?: 0 | 1
}

export interface ReassortData {
  items: ReassortItem[]
  pagination: ProductPagination
  /** Totals of the returned page only, as the legacy list totals it. */
  totals: { page_stock_units: number; page_stock_value: number; page_below_alert: number; page_to_order: number; scope: string }
  filters: { virtual_included: boolean; rows_without_stock_shown: boolean; physical_stock_source: string }
}

export interface ReassortLotItem {
  product: { id: number; ref: string; label: string; type: number; price: number; price_ttc: number; stock_limit: number; desired_stock: number; to_sell: number; to_buy: number; batch_enabled: boolean }
  warehouse: { id: number; ref: string; location: string; parent_id: number }
  lot_id: number | null
  batch: string
  /** From product_lot, the record that owns the dates. */
  eatby: UnixTime
  sellby: UnixTime
  expired: boolean
  stock_physique: number
  batch_rows: number
}

export interface ReassortLotParams {
  page?: number
  limit?: number
  type?: 0 | 1
  search_all?: string
  batch?: string
  /** Matched on the warehouse ref, as the legacy page does. */
  warehouse?: string
  categ?: number
}

export interface ReassortLotData {
  items: ReassortLotItem[]
  pagination: ProductPagination
  totals: { page_units: number; page_expired_lots: number; scope: string }
}

export interface StockAtDateItem {
  id: number
  ref: string
  label: string
  type: number
  pmp: number
  price: number
  current_stock: number
  stock_at_date: number
  /** Movements undone to walk back to the date; null in future mode (never counted). */
  movements_since: number | null
  /** Future mode only: the theoretical stock with no date limit. */
  virtual_stock: number | null
  value_at_pmp: number
  current_value: number
  sell_value: number
  stock_limit: number
  desired_stock: number
}

export interface StockAtDateParams {
  /** YYYY-MM-DD, required. */
  date: string
  mode?: 'past' | 'future'
  product?: number
  /** Comma-separated warehouse ids. */
  warehouse?: string
  ref?: string
  label?: string
  page?: number
  limit?: number
}

export interface StockAtDateData {
  mode: 'past' | 'future'
  date: string
  date_end_of_day: number
  items: StockAtDateItem[]
  pagination: ProductPagination
  totals: { page_stock_at_date: number; page_current_stock: number; scope: string }
  /** Which arithmetic produced the figures (past and future are computed differently). */
  basis: string
  filters: { product: number; warehouses: number[]; services_included: boolean }
}

/**
 * One lot. The list's item shape was never captured (newecuenta has no
 * lot-tracked product), so the fields beyond id / batch / dates are optional and
 * read defensively by the caller.
 */
export interface ProductLotItem {
  id: number
  batch: string
  eatby?: UnixTime | string
  sellby?: UnixTime | string
  datec?: UnixTime | string
  product?: { id: number; ref?: string; label?: string } | number
  fk_product?: number
  product_ref?: string
  product_label?: string
  expired?: boolean
  stock_qty?: number
  qty?: number
  /** Single-lot read only. */
  stock?: { total_qty: number; warehouses: { id?: number; fk_entrepot?: number; ref?: string; label?: string; qty?: number; reel?: number }[] }
}

export interface ProductLotListParams {
  page?: number
  limit?: number
  product?: number
  batch?: string
  ref?: string
  label?: string
  warehouse?: number
  expired?: 1
  /** YYYY-MM-DD */
  eatby_before?: string
}

export interface ProductLotListData {
  items: ProductLotItem[]
  pagination: ProductPagination
  totals: { page_stock_qty: number; page_expired: number; scope: string }
  can_create: boolean
  can_delete: boolean
}

export interface ProductLotInput {
  product: number
  batch: string
  /** YYYY-MM-DD, or '' to clear. */
  eatby?: string
  sellby?: string
}

export function listStockReplenishment(params: ReassortParams = {}) {
  return call<ReassortData>(fapi.get(`${STOCK_BASE}/reassort.php`, { params }), 'Could not load the stock list.')
}

export function listStockByLot(params: ReassortLotParams = {}) {
  return call<ReassortLotData>(fapi.get(`${STOCK_BASE}/reassort_lot.php`, { params }), 'Could not load the stock by lot.')
}

/** 422 without a date, or with one that is not a real calendar date. */
export function getStockAtDate(params: StockAtDateParams) {
  return call<StockAtDateData>(fapi.get(`${STOCK_BASE}/stock_at_date.php`, { params }), 'Could not load the stock at this date.')
}

export function listProductLots(params: ProductLotListParams = {}) {
  return call<ProductLotListData>(fapi.get(`${STOCK_BASE}/lots.php`, { params }), 'Could not load the lots/serials.')
}

export function getProductLot(id: number | string) {
  return call<ProductLotItem>(fapi.get(`${STOCK_BASE}/lots.php`, { params: { id } }), 'Could not load this lot/serial.')
}

function postLot<T>(action: string, body: Record<string, unknown>, fallback: string) {
  return call<T>(fapi.post(`${STOCK_BASE}/lots.php`, { action, ...body }, { params: { action } }), fallback)
}

/** 422 when the product is not managed by lot or serial. */
export function createProductLot(input: ProductLotInput) {
  return postLot<ProductLotItem>('create', { ...input }, 'Could not create the lot/serial.')
}

/** Renaming a lot that holds stock is refused with 409 (stock rows join a lot by its text). */
export function updateProductLot(id: number, fields: Partial<Omit<ProductLotInput, 'product'>>) {
  return postLot<ProductLotItem>('update', { id, ...fields }, 'Could not update the lot/serial.')
}

/** A lot that still holds stock needs confirm:true; the error names the quantity. */
export function deleteProductLot(id: number, confirm = false) {
  return postLot<Record<string, unknown>>('delete', confirm ? { id, confirm: true } : { id }, 'Could not delete the lot/serial.')
}

// ── Variant attributes (variants/fapi/attributes.php) ──

export interface VariantAttributeValue {
  id: number
  attribute_id: number
  ref: string
  value: string
}

export interface VariantAttribute {
  id: number
  ref: string
  ref_ext: string
  label: string
  position: number
  value_count: number
  product_count: number
  /** True while a product combination uses it: delete is then refused with 409. */
  is_used: boolean
  values?: VariantAttributeValue[]
}

export interface VariantAttributeListData {
  items: VariantAttribute[]
  count: number
  can_create: boolean
}

const ATTR_URL = '/variants/fapi/attributes.php'

function postAttribute<T>(action: string, body: Record<string, unknown>, fallback: string) {
  return call<T>(fapi.post(ATTR_URL, { action, ...body }, { params: { action } }), fallback)
}

export function listVariantAttributes() {
  return call<VariantAttributeListData>(fapi.get(ATTR_URL), 'Could not load the variant attributes.')
}

export function getVariantAttribute(id: number | string) {
  return call<VariantAttribute>(fapi.get(ATTR_URL, { params: { id } }), 'Could not load this attribute.')
}

/** The business layer upper-cases the ref and strips what cannot go in a file name; the response carries the stored value. */
export function createVariantAttribute(input: { ref: string; label: string }) {
  return postAttribute<VariantAttribute>('create', input, 'Could not create the attribute.')
}

export function updateVariantAttribute(id: number, input: { ref?: string; label?: string }) {
  return postAttribute<VariantAttribute>('update', { id, ...input }, 'Could not update the attribute.')
}

export function deleteVariantAttribute(id: number) {
  return postAttribute<Record<string, unknown>>('delete', { id }, 'Could not delete the attribute.')
}

export function addVariantAttributeValue(id: number, input: { ref: string; value: string }) {
  return postAttribute<{ value_id: number; attribute: VariantAttribute }>('add_value', { id, ...input }, 'Could not add the value.')
}

export function updateVariantAttributeValue(id: number, valueId: number, input: { ref?: string; value?: string }) {
  return postAttribute<{ attribute?: VariantAttribute }>('update_value', { id, value_id: valueId, ...input }, 'Could not update the value.')
}

export function deleteVariantAttributeValue(id: number, valueId: number) {
  return postAttribute<{ attribute?: VariantAttribute }>('delete_value', { id, value_id: valueId }, 'Could not delete the value.')
}

export function moveVariantAttribute(id: number, direction: 'up' | 'down') {
  return postAttribute<Record<string, unknown>>(direction === 'up' ? 'move_up' : 'move_down', { id }, 'Could not move the attribute.')
}

// ── All-products statistics (product/fapi/global_stats.php) ──

export interface GlobalStatsSeries {
  label: string
  total: number
  /** One point per period, oldest first; `month` is the single-letter label, `period` is what to plot. */
  points: { period: string; month: string; value: number }[]
}

export interface GlobalStatsParams {
  /** 0 = products, 1 = services, -1 = both. */
  type: 0 | 1 | -1
  mode?: 'byunit' | 'bynumber'
  /** January–December of that year; omitted = the twelve months ending this one. */
  year?: number
  /** Tag id, -2 = untagged. */
  categ?: number
}

export interface GlobalStatsData {
  type: number
  type_label: string
  mode: 'byunit' | 'bynumber'
  mode_label: string
  year: number | null
  year_label: string
  categ: number | null
  /** How many products/services matched the filters. */
  covers: number
  periods: string[]
  series: Record<string, GlobalStatsSeries>
  available: string[]
  /** Series left out because the module is off or the right is missing — never a zero. */
  skipped: (string | { series?: string; key?: string; reason?: string })[]
}

export function getGlobalProductStats(params: GlobalStatsParams) {
  return call<GlobalStatsData>(fapi.get(`${BASE}/global_stats.php`, { params }), 'Could not load the statistics.')
}

// ── Bulk tools (product/fapi/bulk_vat.php, bulk_price.php) ──
// Both are a dry run until confirm:true, need at least one filter and cap at
// max_rows (500) per call. Every row comes back with its own status.

export interface BulkFilters {
  products?: number[]
  categ?: number
  type?: 0 | 1
  ref_like?: string
}

export interface BulkVatRate {
  rate: number
  code: string
  note: string
}

export interface BulkVatInfo {
  vat_rates: BulkVatRate[]
  country_id: number
  product_count: number
  max_rows: number
  can_write: boolean
}

export interface BulkVatInput extends BulkFilters {
  vat_rate: number
  /** Omitted: each product keeps its own code. '' clears it on purpose. */
  vat_code?: string
  /** Filter: products currently on this rate. */
  current_vat?: number
}

export type BulkRowStatus = 'changed' | 'unchanged' | 'would_change' | 'skipped_no_cost' | 'refused_negative' | 'error' | (string & {})

export interface BulkVatRow {
  id: number
  ref: string
  label: string
  vat_from: number
  vat_to: number
  vat_code_from: string
  vat_code_to: string
  price_ht: number
  price_ttc_from: number
  price_ttc_to: number
  price_base: string
  status: BulkRowStatus
  message?: string
}

export interface BulkResultCounts {
  dry_run: boolean
  matched: number
  would_change: number
  changed: number
  skipped: number
  failed: number
  max_rows: number
  note?: string
}

export interface BulkVatResult extends BulkResultCounts {
  vat_rate: number
  vat_code: string
  rows: BulkVatRow[]
}

export function getBulkVatInfo() {
  return call<BulkVatInfo>(fapi.get(`${BASE}/bulk_vat.php`), 'Could not load the VAT rates.')
}

/** confirm=false is a dry run: nothing is written and every matched row comes back with its before/after. */
export function runBulkVat(input: BulkVatInput, confirm = false) {
  return call<BulkVatResult>(fapi.post(`${BASE}/bulk_vat.php`, confirm ? { ...input, confirm: true } : input), 'Could not run the VAT update.')
}

export type BulkPriceMode = 'percent' | 'amount' | 'set' | 'margin_on_cost'

export interface BulkPriceInfo {
  modes: Record<BulkPriceMode, string>
  price_levels: number
  multiprices: boolean
  product_count: number
  max_rows: number
  can_write: boolean
}

export interface BulkPriceInput extends BulkFilters {
  mode: BulkPriceMode
  value: number
  /** Omitted: each product keeps its own base. */
  price_base?: 'HT' | 'TTC'
  /** Decimals, 2 by default. */
  round?: number
  /** Price level when multiprices is on. */
  level?: number
}

export interface BulkPriceRow {
  id: number
  ref: string
  label: string
  price_base: string
  price_from: number
  price_to: number | null
  cost_used: number | null
  status: BulkRowStatus
  message?: string
}

export interface BulkPriceResult extends BulkResultCounts {
  mode: BulkPriceMode
  mode_label: string
  value: number
  price_base: string
  round: number
  level: number
  rows: BulkPriceRow[]
}

export function getBulkPriceInfo() {
  return call<BulkPriceInfo>(fapi.get(`${BASE}/bulk_price.php`), 'Could not load the price update options.')
}

export function runBulkPrice(input: BulkPriceInput, confirm = false) {
  return call<BulkPriceResult>(fapi.post(`${BASE}/bulk_price.php`, confirm ? { ...input, confirm: true } : input), 'Could not run the price update.')
}

// ── Tags: single read, update, delete (product/fapi/categories.php) ──

export interface ProductCategoryDetail {
  id: number
  label: string
  parent: number
  color: string
  description: string
  visible: number
  product_count: number
  child_count: number
  can_edit: boolean
  can_delete: boolean
  // Epoch seconds and the creator's login (categories.php returns them since 16 Oct 2026).
  date_creation?: number
  created_by?: string
}

export function getProductCategory(id: number) {
  return call<ProductCategoryDetail>(fapi.get(`${BASE}/categories.php`, { params: { id } }), 'Could not load the tag.')
}

/** A parent that would put the tag inside itself is refused with 422. */
export function updateProductCategory(id: number, fields: { label?: string; parent?: number; color?: string; description?: string; visible?: 0 | 1 }) {
  return call<Record<string, unknown>>(fapi.post(`${BASE}/categories.php`, { action: 'update', id, ...fields }, { params: { action: 'update' } }), 'Could not update the tag.')
}

/** Refused while the tag has children; needs confirm:true while products carry it (they only lose the tag). */
export function deleteProductCategory(id: number, confirm = false) {
  return call<Record<string, unknown>>(
    fapi.post(`${BASE}/categories.php`, confirm ? { action: 'delete', id, confirm: true } : { action: 'delete', id }, { params: { action: 'delete' } }),
    'Could not delete the tag.',
  )
}


// ── Gaps closed 16 Oct 2026 ─────────────────────────────────────────

export interface ProductStockDiffComponent {
  key: string
  label: string
  qty: number
  sign: number
  counted: boolean
  effect: number
  why: string
}
export interface ProductStockDiffDocument {
  id?: number
  ref: string
  status?: number | string
  status_label?: string
  is_draft?: boolean
  qty?: number
  [key: string]: unknown
}
export interface ProductStockDiffData {
  product: { id: number; ref: string; label: string; type: number }
  physical: number
  virtual: number
  difference: number
  components: ProductStockDiffComponent[]
  reconciliation: { computed: number; from_class: number; matches: boolean; unexplained: number; note: string }
  modes: Record<string, boolean | string>
  last_movement: number | null
  pending: { customer_orders: ProductStockDiffDocument[]; supplier_orders: ProductStockDiffDocument[]; shipments: ProductStockDiffDocument[] }
  pending_note?: string
}

/** Why virtual stock differs from physical: every component with the rule that decided it, checked against the class figure. */
export function getProductStockDiff(id: number | string) {
  return call<ProductStockDiffData>(fapi.get(`${BASE}/stock_diff.php`, { params: { id } }), 'Could not load the virtual stock breakdown.')
}

/** Sets the insurance premium, tourism levy and excise categories; the amount comes from the dictionary, never from the caller. */
export function updateProductZraLevies(id: number, codes: { ipl_code?: string; tourism_levy_code?: string; excise_code?: string }) {
  return call<{ applied: Record<string, { code: string; amount: number }> }>(
    fapi.post(`${BASE}/prices.php`, { action: 'update_zra', id, ...codes }, { params: { action: 'update_zra' } }),
    'Could not save the ZRA levy categories.',
  )
}

/** The product's own barcode (the existing generate_barcode fills a packing conversion's). A taken barcode is a 409 naming its owner. */
export function generateProductBarcode(id: number) {
  return postTab<{ id: number; ref: string; barcode: string; previous_barcode: string; formula: string }>('uom.php', 'generate_product_barcode', { id }, 'Could not generate the barcode.')
}

export type PopularityMode = 'facture' | 'commande' | 'propal' | 'all'
export interface ProductPopularityItem {
  rank: number
  product_id: number
  ref: string
  label: string
  type: number
  qty: number
  lines: number
  documents: number
  amount_ht: number
  by_mode?: Record<string, { qty: number; lines: number; documents: number; amount_ht: number }>
}
export interface ProductPopularityData {
  mode: PopularityMode
  mode_label: string
  items: ProductPopularityItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
  totals: { products_ranked: number; page_qty: number; page_amount_ht: number }
  counts_note?: string
}

/** Products or services ranked by how often they appear in invoices, orders or proposals. */
export function getProductPopularity(params: { mode: PopularityMode; type?: 0 | 1; year?: number; categ?: number; page?: number; limit?: number }) {
  return call<ProductPopularityData>(fapi.get(`${BASE}/popularity.php`, { params }), 'Could not load the popularity ranking.')
}

export interface PriceListRow {
  id: number
  label: string
  description: string
  price_type?: string | number
  price_method?: string | number
  min_price?: number | null
  max_price?: number | null
  is_active: boolean
  line_count?: number
  date_creation?: string | number
  [key: string]: unknown
}
export interface PriceListApplyResult {
  dry_run?: boolean
  matched?: number
  would_change?: number
  changed?: number
  deactivates?: unknown
  deactivated?: unknown
  rows?: { ref: string; price_from: number; price_to: number; status: string; price_base?: string }[]
  message?: string
}

export function listProductPriceLists() {
  return call<{ items: PriceListRow[]; pagination: { total: number }; can_create: boolean; note?: string }>(fapi.get(`${BASE}/price_lists.php`), 'Could not load the price lists.')
}
export function getProductPriceListHistory(params: { id?: number; product?: number } = {}) {
  return call<{ items: Record<string, unknown>[]; pagination: { total: number } }>(fapi.get(`${BASE}/price_lists.php`, { params: { action: 'history', ...params } }), 'Could not load the price update history.')
}
export function getProductPriceList(id: number) {
  return call<{ list: PriceListRow; lines: Record<string, unknown>[] }>(fapi.get(`${BASE}/price_lists.php`, { params: { id } }), 'Could not load the price list.')
}
export function productPriceListAction<T = Record<string, unknown>>(action: string, body: Record<string, unknown>) {
  return postTab<T>('price_lists.php', action, body, 'The price list action failed.')
}

export interface ProductEditFormData {
  product: Record<string, unknown> & { id: number }
  options: { vat_rates: unknown[] | null; units: unknown[] | null; countries: unknown[] | null; barcode_types: unknown[] | null; types: unknown[]; price_base_types: string[]; duration_units: unknown[]; measuring_units: unknown[] }
  zra: Record<string, unknown>
  categories: { available: { value: number; label: string; parent: number; color: string }[]; assigned: unknown[] }
  writable: string[]
  readonly: Record<string, string>
  can_edit: boolean
  omitted?: string[]
  submit: { endpoint: string; action: string; method: string; note?: string }
}

/** The edit wizard in one call. omit=units,countries (88% of the payload) answers null for those lists. */
export function getProductEditForm(id: number | string, omit: ('units' | 'countries' | 'vat_rates' | 'barcode_types')[] = []) {
  return call<ProductEditFormData>(fapi.get(`${BASE}/edit_form.php`, { params: { id, omit: omit.join(',') || undefined } }), 'Could not load the edit form.')
}
