import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseLegacyStats } from './legacyStatsParser'

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

// commande/stats/index.php — the classic order statistics page, read through
// legacyStatsParser.ts. Replaces GET /api/orders/stats/, which does not exist
// on the backend (404) and left this page showing a row of zeros as if it were
// real data. Blank filters are simply not sent (the page's own "all").
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
      return parseLegacyStats(await fetchLegacyDocument('/commande/stats/index.php', params), year)
    },
    placeholderData: (prev) => prev,
  })
}
