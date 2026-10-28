import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { yearlyStatsFromBuckets, type YearlyBarChartStats } from './chartStats'

export type ReceptionStats = YearlyBarChartStats

// /reception/fapi/stats.php: 36 monthly buckets (count, weight) with the socid / user filters. The chart shows the count
// for the chosen year and the year before, as the classic page did (its "amount" axis was a weight).
export function useReceptionStats(year: number, socid?: string, userid?: string) {
  return useQuery({
    queryKey: ['receptions', 'stats', year, socid, userid],
    queryFn: async (): Promise<ReceptionStats> => {
      const d = await fapiGet<{ by_month: { year: number; month: number; nb: number }[] }>('/reception/fapi/stats.php', { year, socid, user: userid })
      return yearlyStatsFromBuckets(d.by_month ?? [], year)
    },
    placeholderData: (prev) => prev,
  })
}
