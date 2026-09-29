import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseLegacyStats } from '../salesOrders/legacyStatsParser'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

// commande/stats/index.php?mode=supplier — the classic purchase order
// statistics page (same page as the customer orders one, in supplier mode),
// read through the shared legacyStatsParser.ts. Replaces GET
// /api/purchase-orders/stats/, which does not exist on the backend (404).
export function usePurchaseOrderStats(year: number) {
  return useQuery({
    queryKey: ['purchase-orders', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> =>
      parseLegacyStats(await fetchLegacyDocument('/commande/stats/index.php', new URLSearchParams({ mode: 'supplier', year: String(year) })), year),
    placeholderData: (prev) => prev,
  })
}
