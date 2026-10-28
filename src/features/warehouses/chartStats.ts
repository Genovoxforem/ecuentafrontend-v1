// The data the shipment and reception statistics charts are drawn from (see shipmentStats / receptionStats).
export interface YearlyBarChartStats {
  datasets: { year: string; data: number[] }[]
}

interface FapiMonthBucket {
  year: number
  month: number
  nb: number
}

// expedition/fapi/stats.php and reception/fapi/stats.php answer 36 month buckets (three years). The classic
// charts drew the number of documents for the chosen year and the year before, so those two datasets are cut
// from the buckets. (The legacy "amount" axis was a weight; only the count is charted here.)
export function yearlyStatsFromBuckets(buckets: FapiMonthBucket[], year: number): YearlyBarChartStats {
  return {
    datasets: [year - 1, year].map((y) => ({
      year: String(y),
      data: Array.from({ length: 12 }, (_, i) => buckets.find((b) => b.year === y && b.month === i + 1)?.nb ?? 0),
    })),
  }
}
