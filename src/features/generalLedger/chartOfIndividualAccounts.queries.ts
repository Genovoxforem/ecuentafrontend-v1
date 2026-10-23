import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadSubaccounts, toggleSubaccountReconcilable } from './subaccountsFapi'

// accountancy/fapi/subaccounts.php — the customer, supplier and employee accounting codes.
export function useSubaccounts() {
  return useQuery({
    queryKey: ['generalLedger', 'subaccounts', 'fapi'],
    queryFn: loadSubaccounts,
  })
}

// `accountId` is the chart account the flag lives on (SubaccountRow.toggleUrl).
export function useToggleSubaccountReconcilable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (accountId: string) => toggleSubaccountReconcilable(accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'subaccounts'] }),
  })
}
