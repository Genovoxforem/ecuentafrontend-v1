import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

// Confirmed against api/customers/index.php's buildCustomerRow() — see
// customers.queries.ts for the full notes.
interface RawCustomerOption {
  id: number
  name: string
  is_supplier: number
  code_client: string | null
  tpin: string | null
  country: string | null
}
interface CustomersResponse {
  customers: RawCustomerOption[]
}

// GET /api/customers/?type=customer — same list endpoint the Customers
// page uses, fetched here for use in <select>/SearchableSelect pickers.
// code_client/tpin/country are real columns (code_client, siren, and a
// fk_pays join added to this endpoint specifically for the reference
// layout's own rich customer search — Form::select_thirdparty_list() shows
// "ref | Tpin: x | Country: y" per result the same way).
// `enabled` lets callers that pick between this and useVendorOptions() by a
// `kind` prop skip the unused query instead of firing both on every render.
export function useCustomerOptions(enabled = true) {
  return useQuery({
    queryKey: ['customers', 'options', 'customer'],
    queryFn: async () => {
      const { data } = await api.get<CustomersResponse>('/customers/', { params: { type: 'customer', limit: 250 } })
      return (data.customers ?? []).map((c) => ({
        id: String(c.id),
        name: c.name || '(unnamed)',
        ref: c.code_client ?? '',
        tpin: c.tpin ?? '',
        country: c.country ?? '',
      }))
    },
    staleTime: 1000 * 60,
    enabled,
  })
}

// GET /api/customers/?type=all, filtered client-side on is_supplier — the
// `type` param has no server-side supplier branch (see vendors.queries.ts
// for the full explanation, read directly from the endpoint's source).
export function useVendorOptions(enabled = true) {
  return useQuery({
    queryKey: ['customers', 'options', 'supplier'],
    queryFn: async () => {
      const { data } = await api.get<CustomersResponse>('/customers/', { params: { type: 'all', limit: 250 } })
      return (data.customers ?? []).filter((c) => c.is_supplier === 1).map((c) => ({ id: String(c.id), name: c.name || '(unnamed)' }))
    },
    staleTime: 1000 * 60,
    enabled,
  })
}
