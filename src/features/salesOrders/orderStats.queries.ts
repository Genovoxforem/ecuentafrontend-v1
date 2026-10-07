import { useQuery } from '@tanstack/react-query'
import { fapi } from '../../api/axios'

export interface MonthlyStats {
  year: number
  countByMonth: Record<string, number[]>
  amountByMonth: Record<string, number[]>
  summary: { count: number; totalAmount: number; averageAmount: number }
}

// The classic page's own filters (commande/stats/index.php builds a
// CommandeStats($db, $socid, $mode, $userid, $typent_id, $categ_id) from these
// exact form fields — socid, typent_id, categ_id, userid, object_status, year).
export interface OrderStatsFilters {
  socid?: string
  userid?: string
  typentId?: string
  categId?: string
  status?: string
}

// commande/fapi/stats.php — the same CommandeStats class the legacy page
// builds (same SQL, same filters, same entity + sales-rep isolation), as
// JSON. Blank filters are simply not sent (the page's own "all").
export function useOrderStats(year: number, filters: OrderStatsFilters = {}) {
  const { socid, userid, typentId, categId, status } = filters
  return useQuery({
    queryKey: ['orders', 'stats', year, socid, userid, typentId, categId, status],
    queryFn: async (): Promise<MonthlyStats> => {
      const params = new URLSearchParams({ year: String(year) })
      if (socid) params.set('socid', socid)
      if (userid) params.set('userid', userid)
      if (typentId) params.set('typent_id', typentId)
      if (categId) params.set('categ_id', categId)
      if (status) params.set('object_status', status)
      const { data } = await fapi.get<{ success: boolean; data: {
        count_by_month: Record<string, number[]>
        amount_by_month: Record<string, number[]>
        summary: { count: number; total_amount: number; average_amount: number }
      }; message: string | null }>(`/commande/fapi/stats.php?${params.toString()}`)
      const d = data.data
      return {
        year,
        countByMonth: d.count_by_month ?? {},
        amountByMonth: d.amount_by_month ?? {},
        summary: {
          count: d.summary?.count ?? 0,
          totalAmount: d.summary?.total_amount ?? 0,
          averageAmount: d.summary?.average_amount ?? 0,
        },
      }
    },
    placeholderData: (prev) => prev,
  })
}
