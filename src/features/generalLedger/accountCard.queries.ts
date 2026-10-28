import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadAccountCard } from './accountCardFapi'
import { deleteCoaAccount } from './generalLedgerSetup.queries'

// The card is read from accountancy/fapi/coa.php (accountCardFapi.ts). The edit form is still the classic
// accountancy/admin/card.php form, read with the generic legacy form reader (useLegacyForm) and saved with
// useSubmitLegacyForm; both are in legacyForm.ts.
export const ACCOUNT_CARD_PATH = '/accountancy/admin/card.php'
const KEY = ['generalLedger', 'accountCard'] as const

export function useAccountCard(id: string | undefined) {
  return useQuery({ queryKey: [...KEY, id], queryFn: ({ signal }) => loadAccountCard(id ?? '', signal), enabled: !!id, staleTime: 0 })
}

// coa.php?action=delete, the same call the chart of accounts tree uses: status 300 is the backend's refusal (the account
// has child accounts or ledger lines), with its own message.
export function useDeleteAccountCard(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const result = await deleteCoaAccount(Number(id))
      if (result.status !== 200) throw new Error(result.message || 'The backend did not delete the account.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
