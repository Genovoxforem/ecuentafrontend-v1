import { useQuery } from '@tanstack/react-query'
import { parseYearlyBarChartStats, type YearlyBarChartStats } from './chartStatsParser'

export type ShipmentStats = YearlyBarChartStats

// The old GET /api/shipments/stats/ this hook called is a genuine Apache 404
// on this backend (confirmed live — plain "Not Found" HTML, not a JSON
// error), same dead-REST-route pattern found for Sales Orders/Warehouses
// elsewhere in this app. The real reference page (expedition/stats/index.php)
// has no JSON endpoint either, but it embeds its actual chart data directly
// in the page's own <script> block as a literal Chart.js config — see
// chartStatsParser.ts for exactly how this is extracted (shared with
// receptionStats.queries.ts, which uses the identical real pattern).
// Confirmed live: with no filters and year=2026, this returned
// [0,0,0,1,0,3,0,0,0,0,0,0] for 2026, matching the two real shipments
// created in April and three in June on this install exactly.
//
// The reference page's own second "Year / Number Of Shipments" table
// (visible in its PHP source as $stats->getAllByYear()) turned out to only
// feed the Year <select>'s option list, not a second visible table — the
// live page has no such table anywhere after the chart, confirmed by
// fetching it directly. The previous version of this feature rendered one
// anyway; it's been removed rather than kept showing invented data.
export function useShipmentStats(year: number, socid?: string, userid?: string) {
  return useQuery({
    queryKey: ['shipments', 'stats', year, socid, userid],
    queryFn: async (): Promise<ShipmentStats> => {
      const params = new URLSearchParams({ year: String(year) })
      if (socid) params.set('socid', socid)
      if (userid) params.set('userid', userid)
      const res = await fetch(`/expedition/stats/index.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseYearlyBarChartStats(await res.text(), 'canvas_shipmentsnbinyear')
    },
    placeholderData: (prev) => prev,
  })
}
