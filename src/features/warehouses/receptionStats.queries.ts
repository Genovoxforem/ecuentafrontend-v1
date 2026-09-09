import { useQuery } from '@tanstack/react-query'
import { parseYearlyBarChartStats, type YearlyBarChartStats } from './chartStatsParser'

export type ReceptionStats = YearlyBarChartStats

// reception/stats/index.php — same real pattern as shipmentStats.queries.ts
// (see that file and chartStatsParser.ts for the full writeup): no JSON
// endpoint anywhere, but the real Chart.js dataset is embedded directly in
// the page's own <script>, anchored to canvas_receptionsnbinyear_<year>_png
// (confirmed live). Same $startyear = $year - 1 / $endyear = $year and
// userid/socid/year GET params as the shipment stats page.
export function useReceptionStats(year: number, socid?: string, userid?: string) {
  return useQuery({
    queryKey: ['receptions', 'stats', year, socid, userid],
    queryFn: async (): Promise<ReceptionStats> => {
      const params = new URLSearchParams({ year: String(year) })
      if (socid) params.set('socid', socid)
      if (userid) params.set('userid', userid)
      const res = await fetch(`/reception/stats/index.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseYearlyBarChartStats(await res.text(), 'canvas_receptionsnbinyear')
    },
    placeholderData: (prev) => prev,
  })
}
