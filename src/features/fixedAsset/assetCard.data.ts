import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assetGet, assetPost, type AssetReply } from './assetService'
import type { AssetCard } from './assetModels'
import { ASSET_KEY, invalidateAssetData } from './assetList.data'

const cardKey = (id: number) => [...ASSET_KEY, 'card', id] as const

// asset/api/assets.php?action=get&id=: the whole card (values, schedule, policies, claims, transfers, ledger lines, history, rights).
export function useAssetCard(id: number) {
  return useQuery({
    queryKey: cardKey(id),
    queryFn: ({ signal }) => assetGet<AssetCard>('assets.php', { action: 'get', id }, signal),
    enabled: id > 0,
  })
}

// Every card action is POST assets.php {action, id, ...fields} and answers the refreshed card, so the page shows it at once. Actions of
// asset/js/view.js: save (edit), put_in_service, post_depreciation, move, dispose (+ catch_up), delete, reverse, set_units, policy_save,
// policy_delete, claim_save.
export interface CardAction {
  action: string
  body?: Record<string, unknown>
}

export function useAssetAction(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, body }: CardAction): Promise<AssetReply<AssetCard>> => assetPost<AssetCard>('assets.php', { action, id, ...body }),
    onSuccess: (reply, vars) => {
      if (vars.action !== 'delete' && reply.data && typeof reply.data === 'object') queryClient.setQueryData(cardKey(id), reply.data)
      return invalidateAssetData(queryClient, cardKey(id))
    },
  })
}
