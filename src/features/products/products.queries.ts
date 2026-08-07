import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

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
}

interface ProductsResponse {
  success: boolean
  products: RawProduct[]
  total_count: number
  currency: string
}

function toRow(raw: RawProduct): ProductRow {
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
  }
}

// GET /api/products/ — confirmed live on this app's backend. Products and
// services share this one endpoint (fk_product_type distinguishes them),
// so both hooks below query the same cache key and split client-side
// rather than each making their own request.
function useProductRows() {
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

export function useServicesSummary() {
  const { data, ...rest } = useProductRows()
  const summary: ServicesSummary | undefined = data && {
    totalServices: data.rows.filter((r) => r.type === 'service').length,
    currency: data.currency,
    services: data.rows.filter((r) => r.type === 'service'),
  }
  return { data: summary, ...rest }
}
