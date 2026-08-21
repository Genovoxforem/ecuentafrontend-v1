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

// Matches the reference layout's own real filters (commande/stats/index.php builds a
// Dolibarr CommandeStats($db, $socid, $mode, $userid, $typent_id, $categ_id) from these
// exact params) — added to api/orders/stats/index.php's SQL as real WHERE/JOIN clauses,
// verified live (socid=5 -> count 2, status=1 -> count 66, matching the Orders List page's
// own already-verified validated count).
export interface OrderStatsFilters {
  socid?: string
  userid?: string
  typentId?: string
  categId?: string
  status?: string
}

// GET /api/orders/stats/ (api/orders/stats/index.php) — real, ports the
// Node sales-service monthlyStats() against llx_commande. Was already
// built but unused — SalesStatsPage previously always showed an
// honest-zero placeholder despite this endpoint being ready.
export function useOrderStats(year: number, filters: OrderStatsFilters = {}) {
  const { socid, userid, typentId, categId, status } = filters
  return useQuery({
    queryKey: ['orders', 'stats', year, socid, userid, typentId, categId, status],
    queryFn: async (): Promise<MonthlyStats> => {
      const { data } = await api.get<WebEnvelope<MonthlyStats>>('/orders/stats/', {
        params: {
          year,
          socid: socid || undefined,
          userid: userid || undefined,
          typent_id: typentId || undefined,
          categ_id: categId || undefined,
          status: status || undefined,
        },
      })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}
