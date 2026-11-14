import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assetGet, assetPost } from './assetService'
import type { DepreciationPreview, DepreciationResult } from './assetModels'
import { ASSET_KEY, invalidateAssetData } from './assetList.data'

// asset/api/depreciation.php?action=preview&period=YYYY-MM: every in-service asset with the months still to post up to that period
// (status due / blocked / up_to_date), the totals, whether the user may post and the lock text when the period is closed.
export function useDepreciationPreview(period: string) {
  return useQuery({
    queryKey: [...ASSET_KEY, 'depreciation', period],
    queryFn: ({ signal }) => assetGet<DepreciationPreview>('depreciation.php', { action: 'preview', period }, signal),
    enabled: /^\d{4}-\d{2}$/.test(period),
  })
}

// POST depreciation.php {action:'post', period, ids}: one ledger piece per asset per month; an asset that fails is rolled back and reported
// in the result, the others stay posted.
export function usePostDepreciation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { period: string; ids: number[] }) => assetPost<DepreciationResult>('depreciation.php', { action: 'post', ...v }),
    onSuccess: () => invalidateAssetData(queryClient),
  })
}
