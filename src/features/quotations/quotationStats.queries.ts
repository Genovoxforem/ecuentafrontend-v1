import { useQuery } from '@tanstack/react-query'
import { fetchQuotationStats, type QuotationStatsFilters } from '../../api/quotations'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

export function useQuotationStats(year: number, filters: QuotationStatsFilters = {}) {
  const { socid, userid, typentId, categId, status } = filters
  return useQuery({
    queryKey: ['quotations', 'stats', year, socid, userid, typentId, categId, status],
    queryFn: async (): Promise<MonthlyStats> => {
      const stats = await fetchQuotationStats(year, { socid, userid, typentId, categId, status })
      return {
        year: stats.year,
        countByMonth: stats.count_by_month,
        amountByMonth: stats.amount_by_month,
        summary: {
          count: stats.summary.count,
          totalAmount: stats.summary.total_amount,
          averageAmount: stats.summary.average_amount,
        },
      }
    },
    placeholderData: (prev) => prev,
  })
}
