import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { readValidateMovements } from './validateMovementsParser'

// accountancy/closure/validate.php — see validateMovementsParser.ts.
const PATH = '/accountancy/closure/validate.php'
const KEY = ['generalLedger', 'validateMovements'] as const

export function useValidateMovements(year: number) {
  return useQuery({
    queryKey: [...KEY, year],
    queryFn: async () => readValidateMovements(await fetchLegacyDocument(PATH, new URLSearchParams({ year: String(year) }))),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

// The page's own "Validate movements" link. It validates movements for good (they can no longer be
// changed or deleted). The backend answers with the same page and no status, so all that can be
// reported is a refusal it printed.
export function useRequestValidation(year: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await legacyAdminSend(PATH, { method: 'GET' }, `?${new URLSearchParams({ month: String(year), action: 'validate' })}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
