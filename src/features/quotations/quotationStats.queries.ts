import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseLegacyStats } from '../salesOrders/legacyStatsParser'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

// comm/propal/stats/index.php — the classic quotation statistics page, read
// through the shared legacyStatsParser.ts. Replaces GET /api/quotations/stats/,
// which does not exist on the backend (404).
export function useQuotationStats(year: number) {
  return useQuery({
    queryKey: ['quotations', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> => parseLegacyStats(await fetchLegacyDocument('/comm/propal/stats/index.php', new URLSearchParams({ year: String(year) })), year),
    placeholderData: (prev) => prev,
  })
}
