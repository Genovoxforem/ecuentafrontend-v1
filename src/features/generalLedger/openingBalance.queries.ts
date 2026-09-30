import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { readOpeningBalance, type OpeningBalanceForm } from './openingBalanceParser'

// accountancy/admin/openingbalance.php — see openingBalanceParser.ts.
const PAGE = '/accountancy/admin/openingbalance.php'
const AJAX = '/accountancy/admin/openingbalance_ajax.php'
const KEY = ['generalLedger', 'openingBalance'] as const

const fetchForm = async (): Promise<OpeningBalanceForm> => readOpeningBalance(await fetchLegacyDocument(PAGE))

export function useOpeningBalance() {
  return useQuery({ queryKey: KEY, queryFn: fetchForm, staleTime: 60_000 })
}

export interface OpeningBalanceLineInput {
  account: string
  debit: string
  credit: string
}

// The page's own "Validate Transaction" request: every line, the adjustment line last, one piece
// number for all of them. `date` is yyyy-mm-dd (the backend reads it with strtotime).
export function useValidateOpeningBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, lines }: { date: string; lines: OpeningBalanceLineInput[] }): Promise<void> => {
      const { token } = await fetchForm()
      const body = new URLSearchParams({ token, action: 'validate', newdatepicker: date, type: 'validation' })
      for (const line of lines) {
        body.append('accounts[]', line.account)
        body.append('debit[]', line.debit)
        body.append('credit[]', line.credit)
      }
      const res = await fetch(AJAX, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ status: number | string }[]>(res)
      // The backend commits all rows or none and says which with this status.
      if (Number(data?.[0]?.status) !== 200) throw new Error('The backend did not accept the opening balance. Nothing was saved.')
    },
    // The saved lines are ledger rows, so every ledger view has changed.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
