import { useQuery } from '@tanstack/react-query'
import { fetchThirdParties } from '../../api/customers'
import { fetchAllPages } from '../../api/fapiRow'

// Customer and vendor pickers from societe/fapi/list.php (key-authenticated), paged 100 at a time.
// `enabled` lets callers that pick between this and useVendorOptions() by a `kind` prop skip the unused query.
export function useCustomerOptions(enabled = true) {
  return useQuery({
    queryKey: ['customers', 'options', 'customer'],
    queryFn: async () => {
      const items = await fetchAllPages((page) => fetchThirdParties({ type: 'customer', limit: 100, page, sort: 'name', direction: 'asc' }))
      return items.map((c) => ({
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

export function useVendorOptions(enabled = true) {
  return useQuery({
    queryKey: ['customers', 'options', 'supplier'],
    queryFn: async () => {
      const items = await fetchAllPages((page) => fetchThirdParties({ type: 'vendor', limit: 100, page, sort: 'name', direction: 'asc' }))
      return items.map((c) => ({ id: String(c.id), name: c.name || '(unnamed)' }))
    },
    staleTime: 1000 * 60,
    enabled,
  })
}
