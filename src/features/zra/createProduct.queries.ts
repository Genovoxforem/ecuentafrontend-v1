import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

// GET /api/zra/asycuda-imports/prefill/ — real, proxies the legacy ecuenta9
// install's quicklinks_ajax.php?type=get_importproduct action (session-login
// proxy, same as asycuda-imports/index.php). Also returns countryId/qtyUnit/
// packUnit, which that same legacy action derives from the ASYCUDA
// declaration itself — used to auto-fill Country of Origin/Unit/Packaging
// Unit exactly like the legacy "Add Products" form does.
export interface ProductPrefill {
  ref: string
  label: string
  taskCode: string
  countryId: string
  qtyUnit: string
  packUnit: string
}
export function useProductPrefill(taskCode: string | null) {
  return useQuery({
    queryKey: ['zra', 'asycuda-imports', 'prefill', taskCode],
    queryFn: async (): Promise<ProductPrefill> => {
      const { data } = await api.get<{ success: boolean; data: ProductPrefill }>('/zra/asycuda-imports/prefill/', { params: { taskCd: taskCode } })
      return data.data
    },
    enabled: !!taskCode,
    staleTime: 1000 * 30,
  })
}

// GET /api/zra/product-form-options/ — real, direct SQL matching the exact
// Dolibarr helper functions the legacy "Add Products" form uses
// (Form::select_country/selectUnits/load_tvacategories,
// FormProduct::selectWarehouses, FormBarCode::selectBarcodeType,
// Form::select_all_categories) — see that endpoint's header comment for the
// per-list source. Loaded once per modal open; these are dictionary tables,
// effectively static during a session.
export interface FormOption {
  value: string
  label: string
}
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
}
export function useProductFormOptions() {
  return useQuery({
    queryKey: ['zra', 'product-form-options'],
    queryFn: async (): Promise<ProductFormOptions> => {
      const { data } = await api.get<{ success: boolean; data: ProductFormOptions }>('/zra/product-form-options/')
      return data.data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// GET /api/zra/product-classifications/?term= — real, direct SQL against
// llx_c_productclassification, matching htdocs/custom/zra/
// productclassification.php's own query (same table, same active=1 + LIKE
// filter) — backs the Product Classification typeahead.
export interface ProductClassification {
  id: string
  code: string
  label: string
}
export function useProductClassificationSearch(term: string) {
  return useQuery({
    queryKey: ['zra', 'product-classifications', term],
    queryFn: async (): Promise<ProductClassification[]> => {
      const { data } = await api.get<{ success: boolean; data: ProductClassification[] }>('/zra/product-classifications/', { params: { term } })
      return data.data
    },
    enabled: term.trim().length >= 2,
    staleTime: 1000 * 30,
  })
}

// POST /api/products/create-full/ — real, proxies THIS install's own
// custom/zra/ajax_products.php addproducts action (session-login proxy,
// api/_local_zra_proxy.php) — the actual legacy "Add Products" form target,
// which both inserts the product row AND (when MAIN_MODULE_ZRA is enabled)
// pushes it live to the real ZRA gateway in the same request. Field names
// here match that endpoint's expected JSON body exactly.
export interface CreateProductFullInput {
  ref: string
  label: string
  prodType?: 0 | 1
  statut: string
  statutBuy: string
  finished: string
  itemClassification: string
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
  length?: string
  width?: string
  height?: string
  surface?: string
  volume?: string
  accountancySell?: string
  accountancySellExport?: string
  accountancyBuy?: string
  accountancyBuyExport?: string
  categories?: string[]
  isWebsite?: boolean
  taskCode?: string
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProductFullInput) => {
      const { data } = await api.post<{ success: boolean; data: { status: number } }>('/products/create-full/', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['zra'] })
    },
  })
}
