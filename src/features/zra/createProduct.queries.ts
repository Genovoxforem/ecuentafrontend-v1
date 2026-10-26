import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createProductCategory, isMissingEndpoint, searchZraClassification } from '../../api/products'
import { fapiGet } from '../../api/fapiEnvelope'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { SIZE_UNITS, SURFACE_UNITS, VOLUME_UNITS, WEIGHT_UNITS, type FormOption } from '../products/productConstants'

// The "Add Products" flow of the ZRA module, wired to what the backend itself
// uses (all confirmed live against 172.16.5.10 by reading custom/zra/
// zra-import.php and the endpoints its own scripts call):
//   - form options and their default selections: GET /product/fapi/form_options.php
//     (countries, units, packaging, tax categories, warehouses, barcode types,
//     accounts, tags/categories);
//   - ASYCUDA prefill:   POST /quicklinks_ajax.php  type=get_importproduct;
//   - classification search: GET /product/fapi/zra_classification.php?q= (JSON; the
//     older custom/zra/productclassification.php answers when that is not deployed);
//   - new tag/category:  POST /product/fapi/categories.php?action=create (JSON, returns
//     the new id; the older product/ajax/products.php answers when that is not deployed);
//   - create product:    POST /custom/zra/ajax_products.php  type=addproducts
//     (inserts the product AND registers it with the ZRA gateway in one request).
// The old /api/zra/* and /api/products/create-full/ routes this used to call are
// not on this backend.

export type { FormOption }

const collapse = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

// ---------------------------------------------------------------------------
// Form options + defaults, read from the real form
// ---------------------------------------------------------------------------

export interface ProductFormOptions {
  countries: FormOption[]
  units: FormOption[]
  packingUnits: FormOption[]
  vatCategories: FormOption[]
  iplCategories: FormOption[]
  tourismCategories: FormOption[]
  exciseCategories: FormOption[]
  warehouses: FormOption[]
  barcodeTypes: FormOption[]
  categories: FormOption[]
  accountingAccounts: FormOption[]
  natures: FormOption[] // Finished Product / Raw Material / Service
  weightUnits: FormOption[]
  sizeUnits: FormOption[]
  surfaceUnits: FormOption[]
  volumeUnits: FormOption[]
  // what the real form has pre-selected (Zambia, TTC pricing, 16 (A), Code 128, the default accounts…)
  defaults: Record<string, string>
}

// product/fapi/form_options.php. Tax categories and unit lists carry the value the create
// call still posts (legacy_value, e.g. "16 (A)", "69 (ACR)"), so that is what each option holds.
interface FapiOption {
  value: string | number
  label: string
  legacy_value?: string
}
interface FapiFormOptions {
  countries?: FapiOption[]
  categories?: FapiOption[]
  warehouses?: FapiOption[]
  barcode_types?: FapiOption[]
  accounting_accounts?: FapiOption[]
  natures?: FapiOption[]
  measuring_units?: { weight?: FapiOption[]; size?: FapiOption[]; surface?: FapiOption[]; volume?: FapiOption[] }
  zra?: {
    vat_categories?: FapiOption[]
    ipl_categories?: FapiOption[]
    tl_categories?: FapiOption[]
    excise_categories?: FapiOption[]
    packaging_units?: FapiOption[]
    quantity_units?: FapiOption[]
  }
  defaults?: Record<string, unknown> & { accountancy?: { product?: Record<string, string> } }
}

export function mapProductFormOptions(d: FapiFormOptions): ProductFormOptions {
  const list = (items: FapiOption[] | undefined, legacy = false): FormOption[] =>
    (items ?? []).map((o) => ({ value: String(legacy && o.legacy_value ? o.legacy_value : o.value), label: collapse(o.label) })).filter((o) => o.label !== '')
  // Scale codes of the weight/size/surface/volume selects. The endpoint returns these lists empty, so the app's own constants fill them.
  const scale = (items: FapiOption[] | undefined, fallback: FormOption[]) => (items?.length ? list(items) : fallback)
  const df = d.defaults ?? {}
  const str = (v: unknown, fallback = '') => (v === undefined || v === null ? fallback : String(v))
  const vat = list(d.zra?.vat_categories, true)

  const defaults: Record<string, string> = {
    statut: str(df.statut, '1'),
    statut_buy: str(df.statut_buy, '1'),
    finished: str(df.finished, '2'),
    country_id: str(df.country_id),
    price_base_type: str(df.create_form_price_base_type, 'TTC'),
    // the endpoint names the pre-selected category by its legacy value ("16 (A)")
    tva_tx: vat.some((o) => o.value === df.tva_tx) ? str(df.tva_tx) : '',
    fk_barcode_type: str(df.fk_barcode_type),
    weight_units: str(df.weight_units, '0'),
    size_units: str(df.size_units, '0'),
    surface_units: str(df.surface_units, '0'),
    volume_units: str(df.volume_units, '0'),
  }
  for (const [k, v] of Object.entries(df.accountancy?.product ?? {})) defaults[k] = str(v)

  return {
    countries: list(d.countries),
    units: list(d.zra?.quantity_units, true),
    packingUnits: list(d.zra?.packaging_units, true),
    vatCategories: vat,
    iplCategories: list(d.zra?.ipl_categories, true),
    tourismCategories: list(d.zra?.tl_categories, true),
    exciseCategories: list(d.zra?.excise_categories, true),
    warehouses: list(d.warehouses),
    barcodeTypes: list(d.barcode_types),
    categories: list(d.categories),
    accountingAccounts: list(d.accounting_accounts),
    natures: list(d.natures),
    weightUnits: scale(d.measuring_units?.weight, WEIGHT_UNITS),
    sizeUnits: scale(d.measuring_units?.size, SIZE_UNITS),
    surfaceUnits: scale(d.measuring_units?.surface, SURFACE_UNITS),
    volumeUnits: scale(d.measuring_units?.volume, VOLUME_UNITS),
    defaults,
  }
}

const FORM_OPTIONS_KEY = ['zra', 'product-form-options'] as const
const fetchFormOptions = async () => mapProductFormOptions(await fapiGet<FapiFormOptions>('/product/fapi/form_options.php'))

export function useProductFormOptions() {
  return useQuery({
    queryKey: FORM_OPTIONS_KEY,
    queryFn: fetchFormOptions,
    staleTime: 1000 * 60 * 10,
  })
}

// ---------------------------------------------------------------------------
// ASYCUDA prefill
// ---------------------------------------------------------------------------

// Everything the backend's own "Add Products" script copies out of the ASYCUDA
// declaration line into the form. The unit codes are the declaration's own
// (pkgUnitCd / qtyUnitCd); pickUnitByCode() turns them into the real form option
// exactly like the page's selectUnitByCode().
export interface ProductPrefill {
  ref: string
  label: string
  taskCode: string
  countryId: string
  qtyUnit: string // the backend's own fallback, "<rowid> (<code>)" or a blank-ish " ()"
  packUnit: string
  qtyUnitCode: string
  packUnitCode: string
  price: string
  weight: string
}

interface RawPrefill {
  error?: string
  taskcode?: string
  proreference?: string
  product?: string
  country_id?: string | number
  pack_unit?: string
  qty_unit?: string
  response?: { hsCd?: string; itemNm?: string; pkgUnitCd?: string; qtyUnitCd?: string; invcFcurAmt?: string | number; totWt?: string | number }
}

export function useProductPrefill(taskCode: string | null) {
  return useQuery({
    queryKey: ['zra', 'asycuda-imports', 'prefill', taskCode],
    queryFn: async (): Promise<ProductPrefill> => {
      const res = await fetch('/quicklinks_ajax.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ type: 'get_importproduct', taskCd: taskCode ?? '' }),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = await res.text()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      let data: RawPrefill
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('The backend returned an unreadable reply for this ASYCUDA line.')
      }
      if (data.error) throw new Error(data.error)
      const r = data.response ?? {}
      return {
        ref: String(r.hsCd || data.proreference || ''),
        label: String(r.itemNm || data.product || ''),
        taskCode: String(data.taskcode || taskCode || ''),
        countryId: data.country_id != null ? String(data.country_id) : '',
        qtyUnit: data.qty_unit ?? '',
        packUnit: data.pack_unit ?? '',
        // Same code translation as the backend's script: CT -> PACK, KG -> U.
        packUnitCode: String(r.pkgUnitCd ?? '').toUpperCase() === 'CT' ? 'PACK' : String(r.pkgUnitCd ?? ''),
        qtyUnitCode: String(r.qtyUnitCd ?? '').toUpperCase() === 'KG' ? 'U' : String(r.qtyUnitCd ?? ''),
        price: r.invcFcurAmt != null ? String(r.invcFcurAmt) : '',
        weight: r.totWt != null ? String(r.totWt) : '',
      }
    },
    enabled: !!taskCode,
    staleTime: 1000 * 30,
  })
}

// The option whose value ends in "(CODE)" for the given unit code, else the
// backend's own fallback when that is a real option, else nothing.
export function pickUnitByCode(options: FormOption[], code: string, fallback: string): string {
  const wanted = code.toUpperCase()
  if (wanted) {
    const hit = options.find((o) => o.value.match(/\(([^)]+)\)$/)?.[1].toUpperCase() === wanted)
    if (hit) return hit.value
  }
  return options.some((o) => o.value === fallback) ? fallback : ''
}

// ---------------------------------------------------------------------------
// Product classification typeahead
// ---------------------------------------------------------------------------

export interface ProductClassification {
  id: string
  code: string
  label: string
}

interface RawClassification {
  id?: string | number
  code?: string
  value?: string
  label?: string // an HTML fragment: <h6>CODE_Name</h6>
}

export function useProductClassificationSearch(term: string) {
  return useQuery({
    queryKey: ['zra', 'product-classifications', term],
    queryFn: async (): Promise<ProductClassification[]> => {
      try {
        // The dictionary holds ~150,000 rows, so the endpoint wants two characters or more.
        const found = await searchZraClassification(term.trim())
        return found.items.map((r) => ({ id: r.code, code: r.code, label: collapse(r.label) }))
      } catch (error) {
        if (!isMissingEndpoint(error)) throw error
      }
      const res = await fetch(`/custom/zra/productclassification.php?term=${encodeURIComponent(term.trim())}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = (await res.text()).trim()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (text === '') return []
      const rows: RawClassification[] = JSON.parse(text)
      return rows.map((r) => {
        const shown = collapse((r.label ?? '').replace(/<[^>]*>/g, ' '))
        const code = String(r.code ?? r.value ?? '')
        return { id: String(r.id ?? code), code, label: shown.startsWith(`${code}_`) ? shown.slice(code.length + 1) : shown }
      })
    },
    enabled: term.trim().length >= 2,
    staleTime: 1000 * 30,
  })
}

// ---------------------------------------------------------------------------
// Create tag / category
// ---------------------------------------------------------------------------

export interface CreateCategoryInput {
  label: string
  description?: string
  parentId?: string
  // ids currently ticked on the product form; the backend action takes them along
  selected?: string[]
}

// POST /product/fapi/categories.php?action=create returns the new category's id
// straight away (a duplicate name at the same level is a 409 with its own
// message). A backend without that endpoint falls back to product/ajax/products.php
// action=save_categories, which replies [{ a: 1 }] when the name already exists and
// [{ a: 2 }] once it is created, without saying which category it made — so the new
// category is found by re-reading the form's own tag list afterwards.
export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCategoryInput): Promise<{ categoryId: string; label: string }> => {
      try {
        const created = await createProductCategory({ label: input.label, parent: input.parentId ? Number(input.parentId) : 0 })
        // The form's own tag list must show it too.
        await queryClient.fetchQuery({ queryKey: FORM_OPTIONS_KEY, queryFn: fetchFormOptions, staleTime: 0 })
        return { categoryId: String(created.id), label: created.label }
      } catch (error) {
        if (!isMissingEndpoint(error)) throw error
      }
      const before = await queryClient.ensureQueryData({ queryKey: FORM_OPTIONS_KEY, queryFn: fetchFormOptions, staleTime: 1000 * 60 * 10 })
      const res = await fetch('/product/ajax/products.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          cat_label: input.label,
          prod_cat: input.parentId ?? '',
          cat_description: input.description ?? '',
          action: 'save_categories',
          categories: (input.selected ?? []).join(','),
        }),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = (await res.text()).trim()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      let reply: { a?: number | string }[]
      try {
        reply = JSON.parse(text)
      } catch {
        throw new Error('The backend returned an unreadable reply for the new category.')
      }
      const outcome = Number(reply[0]?.a)
      if (outcome === 1) throw new Error('Category Name already exists')
      if (outcome !== 2) throw new Error('The backend did not confirm the new category.')

      const after = await queryClient.fetchQuery({ queryKey: FORM_OPTIONS_KEY, queryFn: fetchFormOptions, staleTime: 0 })
      const known = new Set(before.categories.map((c) => c.value))
      const created = after.categories.find((c) => !known.has(c.value)) ?? after.categories.find((c) => c.label === input.label || c.label.endsWith(`>> ${input.label}`))
      if (!created) throw new Error('The category was created but could not be found in the refreshed list.')
      return { categoryId: created.value, label: created.label }
    },
  })
}

// ---------------------------------------------------------------------------
// Create product
// ---------------------------------------------------------------------------

export interface CreateProductFullInput {
  ref: string
  label: string
  prodType?: 0 | 1
  statut: string
  statutBuy: string
  finished: string
  // "<code>_<name>" as the typeahead shows it, or just the code; the backend
  // is sent the code (that is what its own typeahead puts in the field).
  itemClassification: string
  itemClassificationCode?: string
  countryId: string
  warehouseId?: string
  stockAlertLimit?: string
  desiredStock?: string
  units: string
  packing: string
  price: string
  priceBaseType?: 'HT' | 'TTC'
  priceMin?: string
  vatCategory?: string
  iplCategory?: string
  tourismCategory?: string
  exciseCategory?: string
  barcodeType?: string
  barcode?: string
  weight?: string
  // *Unit fields carry Dolibarr's scale codes (0 = base unit, negative = smaller
  // prefix, 98/99 = imperial) — the values of the real form's unit selects.
  weightUnit?: string
  length?: string
  width?: string
  height?: string
  sizeUnit?: string
  surface?: string
  surfaceUnit?: string
  volume?: string
  volumeUnit?: string
  accountancySell?: string
  accountancySellExport?: string
  accountancyBuy?: string
  accountancyBuyExport?: string
  categories?: string[]
  isWebsite?: boolean
  taskCode?: string
}

// The reply is [{ status: 200 }] on success; anything else is the backend's
// "Connection Error In Product Creation" case. Notices printed by PHP before the
// JSON are skipped.
function readCreateReply(text: string): { status: number; detail: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const tail = text.match(/\[\s*\{[\s\S]*\}\s*\]\s*$/)
    try {
      parsed = tail ? JSON.parse(tail[0]) : undefined
    } catch {
      parsed = undefined
    }
  }
  const first = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown> | undefined
  if (!first) throw new Error('The backend returned an unreadable reply for the new product.')
  const detail = [first.message, first.msg, first.error].find((v): v is string => typeof v === 'string' && v.trim() !== '') ?? ''
  return { status: Number(first.status), detail }
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProductFullInput): Promise<{ status: number }> => {
      // Whatever the caller leaves out takes the value the real form pre-selects.
      const d = (await queryClient.ensureQueryData({ queryKey: FORM_OPTIONS_KEY, queryFn: fetchFormOptions, staleTime: 1000 * 60 * 10 })).defaults
      const pick = (v: string | undefined, key: string, fallback = '') => (v !== undefined && v !== '' ? v : (d[key] ?? fallback))

      const body = new URLSearchParams()
      const set = (k: string, v: string) => body.append(k, v)
      set('asycuda_type', input.taskCode || d.asycuda_type || '0')
      set('prod_type', String(input.prodType ?? d.prod_type ?? '0'))
      set('ref', input.ref)
      set('label', input.label)
      set('statut', input.statut)
      set('statut_buy', input.statutBuy)
      set('itemclassification', input.itemClassificationCode ?? input.itemClassification.split('_')[0])
      set('finished', input.finished)
      set('country_id', input.countryId)
      set('fk_default_warehouse', pick(input.warehouseId, 'fk_default_warehouse', '-1'))
      set('seuil_stock_alerte', input.stockAlertLimit ?? '')
      set('desiredstock', input.desiredStock ?? '')
      set('units', input.units)
      set('packing', input.packing)
      set('price', input.price)
      set('price_base_type', pick(input.priceBaseType, 'price_base_type', 'TTC'))
      set('price_min', input.priceMin ?? '')
      set('tva_tx', pick(input.vatCategory, 'tva_tx', '0'))
      set('iplCatCd', pick(input.iplCategory, 'iplCatCd', '0'))
      set('tlCatCd', pick(input.tourismCategory, 'tlCatCd', '0'))
      set('exciseTxCatCd', pick(input.exciseCategory, 'exciseTxCatCd', '0'))
      set('fk_barcode_type', pick(input.barcodeType, 'fk_barcode_type', '0'))
      set('barcode', input.barcode ?? '')
      set('weight', input.weight ?? '')
      set('weight_units', pick(input.weightUnit, 'weight_units', '0'))
      set('size', input.length ?? '')
      set('sizewidth', input.width ?? '')
      set('sizeheight', input.height ?? '')
      set('size_units', pick(input.sizeUnit, 'size_units', '0'))
      set('surface', input.surface ?? '')
      set('surface_units', pick(input.surfaceUnit, 'surface_units', '0'))
      set('volume', input.volume ?? '')
      set('volume_units', pick(input.volumeUnit, 'volume_units', '0'))
      set('accountancy_code_sell', pick(input.accountancySell, 'accountancy_code_sell', ' '))
      set('accountancy_code_sell_export', pick(input.accountancySellExport, 'accountancy_code_sell_export', ' '))
      set('accountancy_code_buy', pick(input.accountancyBuy, 'accountancy_code_buy', ' '))
      set('accountancy_code_buy_export', pick(input.accountancyBuyExport, 'accountancy_code_buy_export', ' '))
      for (const c of input.categories ?? []) set('categories[]', c)
      if (input.isWebsite) set('is_website', '1') // a checkbox: only posted when ticked
      set('type', 'addproducts')

      const res = await fetch('/custom/zra/ajax_products.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = (await res.text()).trim()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const reply = readCreateReply(text)
      if (reply.status !== 200) {
        throw new Error(`Connection Error In Product Creation! Please ask the administrator.${reply.detail ? `\n${reply.detail}` : ''}`)
      }
      return { status: reply.status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['zra'] })
    },
  })
}
