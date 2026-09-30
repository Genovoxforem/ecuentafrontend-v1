import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseSubaccounts } from './components/setup/chartOfIndividualAccountsParser'

const PATH = '/accountancy/admin/subaccount.php'

export function useSubaccounts() {
  return useQuery({
    queryKey: ['generalLedger', 'subaccounts'],
    queryFn: async () => parseSubaccounts(await fetchLegacyDocument(PATH)),  
  })
}

async function followSubaccountLink(url: string): Promise<void> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
}

export function useToggleSubaccountReconcilable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => followSubaccountLink(url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'subaccounts'] }),
  })
}
