import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { assetGet, assetPost } from './assetService'
import type { AssetList, AssetOptions, SupplierLine } from './assetModels'

// Every Fixed Asset v2 query lives under this key, so one call refreshes them all after a write (a posted month changes the list, the
// card, the depreciation run and every report at once).
export const ASSET_KEY = ['fixedAssetsV2'] as const

export function invalidateAssetData(queryClient: QueryClient, except?: readonly unknown[]) {
  return queryClient.invalidateQueries({
    queryKey: ASSET_KEY,
    predicate: (q) => !except || JSON.stringify(q.queryKey) !== JSON.stringify(except),
  })
}

// asset/api/assets.php?action=options: types (with their depreciation defaults), groups, categories, insurers, users, the currency,
// today's date and the next free asset reference.
export function useAssetOptions() {
  return useQuery({
    queryKey: [...ASSET_KEY, 'options'],
    queryFn: ({ signal }) => assetGet<AssetOptions>('assets.php', { action: 'options' }, signal),
    staleTime: 1000 * 60,
  })
}

export interface AssetListQuery {
  q: string
  type: string
  group: string
  lifecycle: string
  page: number
  limit: number
  sort: string
  dir: 'asc' | 'desc'
}

// asset/api/assets.php?action=list: the filters, the sort and the page are the server's; its answer also carries the totals of the
// whole filtered set (count, cost, accumulated, NBV, count per lifecycle) that the four tiles show.
export function useAssetList(p: AssetListQuery) {
  return useQuery({
    queryKey: [...ASSET_KEY, 'list', p],
    queryFn: ({ signal }) => assetGet<AssetList>('assets.php', { action: 'list', ...p }, signal),
    placeholderData: keepPreviousData,
  })
}

// The CSV button exports up to 500 rows of the current filter (the classic page does the same).
export const fetchAssetsForExport = (p: AssetListQuery) => assetGet<AssetList>('assets.php', { action: 'list', ...p, page: 1, limit: 500 })

// asset/api/assets.php?action=supplier_lines&q=: the lines of validated supplier invoices that no asset uses yet.
export function useSupplierLines(q: string, enabled = true) {
  return useQuery({
    queryKey: [...ASSET_KEY, 'supplier-lines', q],
    queryFn: ({ signal }) => assetGet<{ items: SupplierLine[] }>('assets.php', { action: 'supplier_lines', q }, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

// POST assets.php {action:'save', ...values}: creates the asset as a draft and answers its id.
export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => assetPost<{ id: number }>('assets.php', { action: 'save', ...values }),
    onSuccess: () => invalidateAssetData(queryClient),
  })
}
