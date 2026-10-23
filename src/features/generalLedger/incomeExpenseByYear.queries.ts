import { useQuery } from '@tanstack/react-query'
import { loadReportingArea } from './reportsFapi'

export type Basis = 'BOOKKEEPING' | 'RECETTES-DEPENSES' | 'CREANCES-DETTES'

export const BASIS_OPTIONS: { value: Basis; label: string }[] = [
  { value: 'BOOKKEEPING', label: 'Ledger (bookkeeping)' },
  { value: 'RECETTES-DEPENSES', label: 'Receipts and expenses' },
  { value: 'CREANCES-DETTES', label: 'Claims and debts' },
]

export function useIncomeExpenseByYear(lastYear: number | null, basis: Basis) {
  return useQuery({
    queryKey: ['generalLedger', 'incomeExpenseByYear', lastYear, basis],
    // compta/resultat/fapi/reporting_area.php: four years ending `year`, month by month, on the chosen basis.
    queryFn: () => loadReportingArea(lastYear, basis),
    placeholderData: (prev) => prev,
  })
}
