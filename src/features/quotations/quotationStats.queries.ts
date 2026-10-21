import { useQuery } from '@tanstack/react-query'
import { fetchQuotationStats } from '../../api/quotations'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

export function useQuotationStats(year: number) {
  return useQuery({
    queryKey: ['quotations', 'stats', year],
    queryFn: async (): Promise<MonthlyStats> => {
      const stats = await fetchQuotationStats(year)
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
