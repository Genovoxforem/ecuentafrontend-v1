import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseIncomeExpenseByYear } from './incomeExpenseByYearParser'

export type Basis = 'BOOKKEEPING' | 'RECETTES-DEPENSES' | 'CREANCES-DETTES'

export const BASIS_OPTIONS: { value: Basis; label: string }[] = [
  { value: 'BOOKKEEPING', label: 'Ledger (bookkeeping)' },
  { value: 'RECETTES-DEPENSES', label: 'Receipts and expenses' },
  { value: 'CREANCES-DETTES', label: 'Claims and debts' },
]

export function useIncomeExpenseByYear(lastYear: number | null, basis: Basis) {
  return useQuery({
    queryKey: ['generalLedger', 'incomeExpenseByYear', lastYear, basis],
    queryFn: async () => {
      const params = new URLSearchParams({ modecompta: basis })
      if (lastYear) params.set('year', String(lastYear))
      return parseIncomeExpenseByYear(await fetchLegacyDocument('/compta/resultat/index.php', params))
    },
    placeholderData: (prev) => prev,
  })
}
