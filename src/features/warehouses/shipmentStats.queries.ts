import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { yearlyStatsFromBuckets, type YearlyBarChartStats } from './chartStats'

export type ShipmentStats = YearlyBarChartStats

// /expedition/fapi/stats.php: 36 monthly buckets (count, weight) with the socid / user filters. The chart shows the count
// for the chosen year and the year before, as the classic page did (its "amount" axis was a weight).
export function useShipmentStats(year: number, socid?: string, userid?: string) {
  return useQuery({
    queryKey: ['shipments', 'stats', year, socid, userid],
    queryFn: async (): Promise<ShipmentStats> => {
      const d = await fapiGet<{ by_month: { year: number; month: number; nb: number }[] }>('/expedition/fapi/stats.php', { year, socid, user: userid })
      return yearlyStatsFromBuckets(d.by_month ?? [], year)
    },
    placeholderData: (prev) => prev,
  })
}
