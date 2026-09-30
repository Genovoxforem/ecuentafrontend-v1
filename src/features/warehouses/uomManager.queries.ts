import { useQuery } from '@tanstack/react-query'
import { fetchLegacyText, legacyRefusalMessages } from '../../shared/legacyHtmlFetch'

// product/stock/uom/uom_manager.php refuses to open when UOM management is off
// in Stock Settings (or the login may not use it): it prints
// toastr.error("…") messages and redirects to the home page. This reads those
// same messages so the native page can say the same thing instead of showing a
// manager that cannot work.
export interface UomManagerAccess {
  blockedBy: string[]
}

export function useUomManagerAccess() {
  return useQuery({
    queryKey: ['warehouses', 'uomManagerAccess'],
    queryFn: async (): Promise<UomManagerAccess> => ({ blockedBy: legacyRefusalMessages(await fetchLegacyText('/product/stock/uom/uom_manager.php')) }),
    staleTime: 1000 * 60 * 5,
  })
}
