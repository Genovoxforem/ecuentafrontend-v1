import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { FapiSalaryMeta } from './specialMetaFapi'

// salaries/fapi/stats.php: monthly count / amount / average for a year and the year before, plus an all-years roll-up. Params: year, fk_user.
// The roll-up (by_year) is empty on newecuenta, so its row shape is the endpoint's own naming and has not been seen with data.
export interface SalaryStatMonth {
  month: number
  count: number
  amount: number
  amount_rounded: number
  average: number
}
export interface SalaryStats {
  year: number
  previous_year: number
  months: Record<string, SalaryStatMonth[]>
  by_year: Array<{ year: number; count?: number; amount?: number; average?: number }>
  currency: string
  filters: { year: number; fk_user: number | null; socid: number | null }
}

export function useSalaryStats(year: number | undefined, userId: string) {
  return useQuery({
    queryKey: ['ledger', 'salary-stats', year ?? 'default', userId],
    queryFn: ({ signal }) => fapiGet<SalaryStats>('/salaries/fapi/stats.php', { year, fk_user: userId ? Number(userId) : undefined }, signal),
  })
}

export function useSalaryEmployees() {
  return useQuery({
    queryKey: ['ledger', 'salary-employees'],
    queryFn: async () => (await fapiGet<FapiSalaryMeta>('/salaries/fapi/meta.php')).employees,
    staleTime: 1000 * 60 * 10,
  })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// One row per month with the two years side by side, for the three charts.
export function monthSeries(stats: SalaryStats, field: 'count' | 'amount' | 'average') {
  const cur = stats.months[String(stats.year)] ?? []
  const prev = stats.months[String(stats.previous_year)] ?? []
  return MONTHS.map((month, i) => ({
    month,
    [stats.previous_year]: prev.find((m) => m.month === i + 1)?.[field] ?? 0,
    [stats.year]: cur.find((m) => m.month === i + 1)?.[field] ?? 0,
  }))
}
