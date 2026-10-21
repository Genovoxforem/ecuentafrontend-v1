import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'
import { mapSeriesStats } from '../purchases/seriesStats'

// fourn/commande/fapi/stats.php: CommandeStats in supplier mode, the class the chart page instantiates, so the
// numbers match it.
export function usePurchaseOrderStats(year: number) {
  return useQuery({
    queryKey: ['purchase-orders', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> => mapSeriesStats(await fapiGet('/fourn/commande/fapi/stats.php', { year }), year),
    placeholderData: (prev) => prev,
  })
}
