import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/purchase-orders/stats/ (api/purchase-orders/stats/index.php) —
// real, mirrors api/orders/stats/ against llx_commande_fournisseur (see
// that endpoint's header comment).
export function usePurchaseOrderStats(year: number) {
  return useQuery({
    queryKey: ['purchase-orders', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> => {
      const { data } = await api.get<WebEnvelope<MonthlyStats>>('/purchase-orders/stats/', { params: { year } })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}
