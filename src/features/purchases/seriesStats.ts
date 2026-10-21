import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { MonthlyStats } from '../salesOrders/orderStats.queries'

interface StatSeries {
  series: Record<string, Array<{ month: number; value: number }>>
  totals: Record<string, number>
}
interface SeriesStatsResponse {
  year: number
  count: StatSeries
  amount: StatSeries
  average: StatSeries
}

// Twelve month values per year, in month order, from the {month, value} rows the stats endpoints send.
function monthly(series: StatSeries['series'] | undefined): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const [year, rows] of Object.entries(series ?? {})) {
    const values = Array<number>(12).fill(0)
    for (const row of rows) if (row.month >= 1 && row.month <= 12) values[row.month - 1] = Number(row.value) || 0
    out[year] = values
  }
  return out
}

export function mapSeriesStats(d: SeriesStatsResponse, year: number): MonthlyStats {
  const count = Number(d.count?.totals?.[String(year)]) || 0
  const totalAmount = Number(d.amount?.totals?.[String(year)]) || 0
  return {
    year,
    countByMonth: monthly(d.count?.series),
    amountByMonth: monthly(d.amount?.series),
    summary: { count, totalAmount, averageAmount: Number(d.average?.totals?.[String(year)]) || (count ? totalAmount / count : 0) },
  }
}

export interface PurchaseStatsFilters {
  socid?: string
  userid?: string
  typentId?: string
  categId?: string
}

// fourn/facture/fapi/stats.php and supplier_proposal/fapi/stats.php: the same class the classic pages use,
// in supplier mode, with up to five years of history. The amount series is net of tax.
export function usePurchaseSeriesStats(base: string, year: number, filters: PurchaseStatsFilters = {}) {
  const { socid, userid, typentId, categId } = filters
  return useQuery({
    queryKey: ['purchases', 'stats', base, year, socid, userid, typentId, categId],
    queryFn: async (): Promise<MonthlyStats> => {
      const d = await fapiGet<SeriesStatsResponse>(`${base}/stats.php`, { year, socid: socid || undefined, userid: userid || undefined, typent_id: typentId || undefined, categ_id: categId || undefined })
      return mapSeriesStats(d, year)
    },
    placeholderData: (prev) => prev,
  })
}
