import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { ApiCustomerRow } from '../customers/customers.queries'

// The real fourn/facture/asycudapurchase.php page sources its Vendor dropdown
// from Dolibarr's own select_company($societe->id, 'socid', 's.fournisseur=1
// AND s.fk_pays != 239', ...) — a server-rendered <select>, no JSON API of
// its own. /api/customers/index.php?action=list&type=vendor returns the same
// vendor rows (fournisseur=1) as clean JSON via the bearer-token-auth'd `api`
// instance, so we filter client-side to non-Zambia (country_code != 'ZM') to
// match the real page's own "fk_pays != 239" condition (239 = Zambia's rowid
// in llx_c_country).
export interface AsycudaVendorOption {
  id: number
  name: string
  tpin: string
  country: string
}

interface CustomersListResponse {
  success: boolean
  customers: ApiCustomerRow[]
  total_count: number
}

export function useAsycudaVendorOptions() {
  return useQuery({
    queryKey: ['zra', 'asycuda-purchase', 'vendors'],
    queryFn: async (): Promise<AsycudaVendorOption[]> => {
      const { data } = await api.get<CustomersListResponse>('/customers/index.php', {
        params: { action: 'list', type: 'vendor', limit: 1000 },
      })
      return (data.customers ?? [])
        .filter((row) => row.country_code !== 'ZM')
        .map((row) => ({ id: row.id, name: row.name, tpin: row.tpin ?? '', country: row.country }))
    },
    staleTime: 1000 * 60,
  })
}
