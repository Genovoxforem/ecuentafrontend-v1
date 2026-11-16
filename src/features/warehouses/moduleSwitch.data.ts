import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// Lot / serial tracking is the "Lots/Serials" module (modProductBatch). admin/fapi/modules.php lists every module with its on/off state
// (read 13 Nov 2026: enabled on newecuenta, disabled on 5.10). The list is admin only, so any failure (a 403 for another user) answers
// "unknown" and the lot controls stay visible rather than being hidden by a guess.
export async function loadLotTrackingEnabled(): Promise<boolean | undefined> {
  try {
    const d = await fapiGet<{ items?: { class: string; enabled: boolean }[] }>('/admin/fapi/modules.php', { search_keyword: 'ProductBatch' })
    const module = d.items?.find((m) => m.class === 'modProductBatch')
    return module ? module.enabled : undefined
  } catch {
    return undefined
  }
}

export function useLotTrackingEnabled() {
  return useQuery({ queryKey: ['warehouses', 'lotTrackingEnabled'], queryFn: loadLotTrackingEnabled, staleTime: 1000 * 60 * 10, retry: false })
}
