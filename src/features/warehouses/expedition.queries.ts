import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseShipmentListDocument, looksLikeLegacyLoginPage, type ShipmentListRow } from './expeditionHtmlParser'

export type { ShipmentListRow }

// expedition/list.php?viewstatut=0|1|2 — Draft/Validated/Processed, the
// same three states this page's own status dropdown offers (see
// expeditionHtmlParser.ts's header comment for how this was confirmed).
export function useShipmentList(viewStatut: number) {
  return useQuery({
    queryKey: ['warehouses', 'shipments', 'list', viewStatut],
    queryFn: async (): Promise<ShipmentListRow[]> => {
      const doc = await fetchLegacyDocument('/expedition/list.php', new URLSearchParams({ viewstatut: String(viewStatut) }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseShipmentListDocument(doc)
    },
    staleTime: 1000 * 30,
  })
}
