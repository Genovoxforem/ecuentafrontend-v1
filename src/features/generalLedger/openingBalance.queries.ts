import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { mapOpeningBalanceFapi, openingBalanceBody, type FapiOpeningBalance, type OpeningBalanceForm } from './openingBalanceFapi'

// accountancy/fapi/opening_balance.php — see openingBalanceFapi.ts. GET gives the wizard's data; POST saves every line under one new
// transaction number (journal AC for a debit, VT for a credit, doc ref "Opening Balance"), all or none.
const PATH = '/accountancy/fapi/opening_balance.php'
const KEY = ['generalLedger', 'openingBalance'] as const

const fetchForm = async (): Promise<OpeningBalanceForm> => mapOpeningBalanceFapi(await fapiGet<FapiOpeningBalance>(PATH))

export function useOpeningBalance() {
  return useQuery({ queryKey: KEY, queryFn: fetchForm, staleTime: 60_000 })
}

export interface OpeningBalanceLineInput {
  account: string
  debit: string
  credit: string
}

// "Validate Transaction": every line, the adjustment line last. `date` is yyyy-mm-dd.
export function useValidateOpeningBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, lines }: { date: string; lines: OpeningBalanceLineInput[] }): Promise<void> => {
      await fapiPost(PATH, openingBalanceBody(date, lines))
    },
    // The saved lines are ledger rows, so every ledger view has changed.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
