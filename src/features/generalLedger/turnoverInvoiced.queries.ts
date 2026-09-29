import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseTurnoverInvoiced } from './turnoverInvoicedParser'

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
    queryFn: async () => {
      const params = new URLSearchParams({ modecompta: filters.basis })
      if (filters.start && filters.end) params.set('newdatepicker', `${filters.start} - ${filters.end}`)
      return parseTurnoverInvoiced(await fetchLegacyDocument('/compta/stats/index.php', params))
    },
    placeholderData: (prev) => prev,
  })
}
