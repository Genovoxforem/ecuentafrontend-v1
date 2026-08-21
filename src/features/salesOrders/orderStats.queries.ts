import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface MonthlyStats {
  year: number
  countByMonth: Record<string, number[]>
  amountByMonth: Record<string, number[]>
  summary: { count: number; totalAmount: number; averageAmount: number }
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/orders/stats/ (api/orders/stats/index.php) — real, ports the
// Node sales-service monthlyStats() against llx_commande. Was already
// built but unused — SalesStatsPage previously always showed an
// honest-zero placeholder despite this endpoint being ready.
export function useOrderStats(year: number) {
  return useQuery({
    queryKey: ['orders', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> => {
      const { data } = await api.get<WebEnvelope<MonthlyStats>>('/orders/stats/', { params: { year } })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}
