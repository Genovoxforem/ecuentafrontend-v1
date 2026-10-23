import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadProductAccounts, saveProductAccounts } from './productAccountsFapi'
import type { ProductAccountFilters } from './productAccountsParser'

export interface ProductAccountsQuery {
  mode: string
  limit: number
  page: number
  filters: ProductAccountFilters
}

export function useProductAccounts(query: ProductAccountsQuery) {
  return useQuery({
    queryKey: ['generalLedger', 'productAccounts', 'fapi', query],
    queryFn: () => loadProductAccounts(query),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

export interface SaveProductAccountsInput {
  token: string
  mode: string
  limit: number
  page: number
  sortfield: string
  sortorder: string
  // productId -> accounting account option value, for each ticked product
  selections: { productId: string; account: string }[]
}

// product_accounts.php?action=set: binds the chosen account for the mode on every ticked product, in one transaction (an empty account clears it).
export function useSaveProductAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveProductAccountsInput): Promise<string> => saveProductAccounts(input.mode, input.selections),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
