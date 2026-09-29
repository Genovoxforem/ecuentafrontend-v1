import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// The "Add Products" flow of the ZRA module, wired to what the backend itself
// uses (all confirmed live against 172.16.5.10 by reading custom/zra/
// zra-import.php and the endpoints its own scripts call):
//   - form options and their default selections: the page's own #productsForm
//     (countries, units, packaging, tax categories, warehouses, barcode types,
//     accounts, tags/categories);
//   - ASYCUDA prefill:   POST /quicklinks_ajax.php  type=get_importproduct;
//   - classification search: GET /custom/zra/productclassification.php?term=;
//   - new tag/category:  POST /product/ajax/products.php  action=save_categories;
//   - create product:    POST /custom/zra/ajax_products.php  type=addproducts
//     (inserts the product AND registers it with the ZRA gateway in one request).
// The old /api/zra/* and /api/products/create-full/ routes this used to call are
// not on this backend.

export interface FormOption {
  value: string
  label: string
}

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

const PRODUCTS_FORM_PATH = '/custom/zra/zra-import.php'

// Options that only mean "nothing chosen" on the real form.
const NONE = new Set(['0', '-1'])

export function parseProductForm(doc: Document): ProductFormOptions {
  const form: ParentNode = doc.querySelector('#productsForm') ?? doc
  const select = (name: string) => form.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  const options = (name: string, dropNone = true): FormOption[] =>
    Array.from(select(name)?.options ?? [])
      .map((o) => ({ value: o.value, label: collapse(o.textContent) }))
      .filter((o) => o.label !== '' && !(dropNone && NONE.has(o.value)))

  const defaults: Record<string, string> = {}
  for (const s of Array.from(form.querySelectorAll<HTMLSelectElement>('select[name]'))) {
    if (!s.multiple) defaults[s.name] = s.value
  }
  for (const i of Array.from(form.querySelectorAll<HTMLInputElement>('input[name]'))) {
    if (i.type === 'hidden') defaults[i.name] = i.value
  }

  return {
    countries: options('country_id'),
    units: options('units'),
    packingUnits: options('packing'),
    vatCategories: options('tva_tx'),
    iplCategories: options('iplCatCd'),
    tourismCategories: options('tlCatCd'),
    exciseCategories: options('exciseTxCatCd'),
    warehouses: options('fk_default_warehouse'),
    barcodeTypes: options('fk_barcode_type'),
    categories: options('categories[]', false),
    accountingAccounts: options('accountancy_code_sell', false),
    natures: options('finished'),
    weightUnits: options('weight_units', false),
    sizeUnits: options('size_units', false),
    surfaceUnits: options('surface_units', false),
    volumeUnits: options('volume_units', false),
    defaults,
  }
}

const FORM_OPTIONS_KEY = ['zra', 'product-form-options'] as const
const fetchFormOptions = async () => parseProductForm(await fetchLegacyDocument(PRODUCTS_FORM_PATH))

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
    enabled: term.trim().length >= 1,
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

// POST /product/ajax/products.php  action=save_categories replies
// [{ a: 1 }] when the name already exists and [{ a: 2 }] once it is created.
// Its "b" HTML feeds a select that this page does not have, so the new
// category is found by re-reading the form's own tag list afterwards.
export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCategoryInput): Promise<{ categoryId: string; label: string }> => {
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
