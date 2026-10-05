import { useQuery } from '@tanstack/react-query'
import { fetchThirdParties } from '../../api/customers'

// The real fourn/facture/asycudapurchase.php page sources its Vendor dropdown
// from Dolibarr's own select_company($societe->id, 'socid', 's.fournisseur=1
// AND s.fk_pays != 239', ...) — a server-rendered <select>, no JSON API of
// its own. /societe/fapi/list.php?type=vendor returns the same vendor rows
// (fournisseur=1) as clean JSON via the bearer-token-auth'd fapi instance,
// so we filter client-side to non-Zambia (country_code != 'ZM') to match the
// real page's own "fk_pays != 239" condition (239 = Zambia's rowid in
// llx_c_country).
export interface AsycudaVendorOption {
  id: number
  name: string
  tpin: string
  country: string
}

export function useAsycudaVendorOptions() {
  return useQuery({
    queryKey: ['zra', 'asycuda-purchase', 'vendors'],
    queryFn: async (): Promise<AsycudaVendorOption[]> => {
      const { items } = await fetchThirdParties({ type: 'vendor', limit: 100 })
      return items
        .filter((row) => row.country_code !== 'ZM')
        .map((row) => ({ id: row.id, name: row.name, tpin: row.tpin ?? '', country: row.country }))
    },
    staleTime: 1000 * 60,
  })
}
