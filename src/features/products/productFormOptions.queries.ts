import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { SIZE_UNITS, SURFACE_UNITS, VOLUME_UNITS, WEIGHT_UNITS, type FormOption } from './productConstants'

// The product form's dropdown lists and pre-selected values: GET /product/fapi/form_options.php. Used by the create
// forms (products, services, the ZRA "Add Products" flow, the quick product modal) and by the product list filter.

export const collapse = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

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

export const FORM_OPTIONS_KEY = ['product-form-options'] as const
export const fetchProductFormOptions = async () => mapProductFormOptions(await fapiGet<FapiFormOptions>('/product/fapi/form_options.php'))

export function useProductFormOptions() {
  return useQuery({
    queryKey: FORM_OPTIONS_KEY,
    queryFn: fetchProductFormOptions,
    staleTime: 1000 * 60 * 10,
  })
}
