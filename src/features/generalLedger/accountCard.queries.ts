import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { readAccountCard, type AccountCard } from './accountCardParser'

// accountancy/admin/card.php — see accountCardParser.ts. The edit form is read with the generic
// legacy form reader (useLegacyForm) and saved with useSubmitLegacyForm; both are in legacyForm.ts.
export const ACCOUNT_CARD_PATH = '/accountancy/admin/card.php'
const KEY = ['generalLedger', 'accountCard'] as const

const fetchCard = async (id: string): Promise<AccountCard> => readAccountCard(await fetchLegacyDocument(ACCOUNT_CARD_PATH, new URLSearchParams({ id })))

export function useAccountCard(id: string | undefined) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => fetchCard(id ?? ''), enabled: !!id, staleTime: 0 })
}

// The Delete button's own link (it carries the token), taken from the freshly read page. The
// backend deletes at once and opens the account list; the account must then be gone.
export function useDeleteAccountCard(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const href = (await fetchCard(id)).deleteHref
      if (!href) throw new Error('You are not allowed to delete this account.')
      await legacyAdminSend(href, { method: 'GET' })
      // Only "no such account" counts as deleted; a network or session error must not.
      const stillThere = await fetchCard(id).then(
        () => true,
        (e: unknown) => {
          if (e instanceof Error && /was not found on the backend/.test(e.message)) return false
          throw e
        },
      )
      if (stillThere) throw new Error('The backend did not delete the account (it may still be used by ledger lines).')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
