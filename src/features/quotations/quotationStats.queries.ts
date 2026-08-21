import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/quotations/stats/ (api/quotations/stats/index.php) — real,
// mirrors api/orders/stats/ against llx_propal (see that endpoint's header
// comment for the exact legacy PropaleStats fields it was matched to).
export function useQuotationStats(year: number) {
  return useQuery({
    queryKey: ['quotations', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> => {
      const { data } = await api.get<WebEnvelope<MonthlyStats>>('/quotations/stats/', { params: { year } })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}
