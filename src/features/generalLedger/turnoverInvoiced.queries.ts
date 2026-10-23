import { useQuery } from '@tanstack/react-query'
import { loadTurnover } from './reportsFapi'

export const TURNOVER_BASIS_OPTIONS = [
  { value: 'BOOKKEEPING', label: 'Ledger (bookkeeping)' },
  { value: 'RECETTES-DEPENSES', label: 'Receipts and expenses' },
  { value: 'CREANCES-DETTES', label: 'Claims and debts' },
]

export interface TurnoverFilters {
  start: string // MM/dd/yyyy; empty = the backend's own default period
  end: string
  basis: string
}

export function useTurnoverInvoiced(filters: TurnoverFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'turnoverInvoiced', filters],
    // compta/stats/fapi/turnover.php: the period (start / end), the basis (modecompta) and, per year, the amount and its change.
    queryFn: () => loadTurnover(filters),
    placeholderData: (prev) => prev,
  })
}
