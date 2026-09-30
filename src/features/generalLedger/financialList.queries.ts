import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseFinancialList, type FinancialListPage } from './financialListParser'

// accountancy/closure/financiallist.php?year=YYYY — read as the page itself (see financialListParser.ts).
export function useFinancialList(year: number) {
  return useQuery({
    queryKey: ['generalLedger', 'financialList', year],
    queryFn: async (): Promise<FinancialListPage> => parseFinancialList(await fetchLegacyDocument('/accountancy/closure/financiallist.php', new URLSearchParams({ year: String(year) }))),
    staleTime: 1000 * 30,
  })
}
