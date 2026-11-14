import { fapiGet } from '../../api/fapiEnvelope'
import type { StatsChart, StatsResultsTable } from './projectStats.types'

// projet/fapi/stats.php and task_stats.php (13 Nov 2026, #399-400, key-authenticated, read-only), read live on newecuenta (all zero: no project, no task):
//   stats.php?year=       -> {year, by_status [], nb_by_month / amount_by_month / weighted_by_month [{month: 'Jan', previous, current}] (12), by_year [], basis}
//   task_stats.php?year=  -> {year, nb_by_month (12), by_year [], basis}
// "previous" is the year before `year`. The classic pages draw the same charts (datasets named after the two years: 2025 and 2026) and print a table
// of years; the rows of by_year have not been seen (empty), so they are read under the classic columns' names and left blank when a field is absent.
// The Third-party filter of the project page is sent as `socid` (the classic page's own parameter); whether stats.php applies it could not be checked
// with no project on newecuenta.

type Row = Record<string, unknown>
interface Monthly {
  month: string
  previous: number
  current: number
}

export interface StatsView {
  yearOptions: Array<{ value: string; label: string }>
  selectedYear: string
  table: StatsResultsTable | null
  charts: StatsChart[]
}

const first = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== null) return String(r[k])
  return ''
}

// The classic year select lists the years there is data for; the API gives no list, so the last six years are offered.
export function yearChoices(selected: number, rows: Row[]) {
  const years = new Set<number>([selected, ...Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i), ...rows.map((r) => Number(r.year)).filter(Boolean)])
  return [...years].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) }))
}

const chart = (title: string, rows: Monthly[], year: number): StatsChart => ({
  title,
  type: 'bar',
  labels: rows.map((r) => r.month),
  datasets: [
    { label: String(year - 1), data: rows.map((r) => Number(r.previous) || 0) },
    { label: String(year), data: rows.map((r) => Number(r.current) || 0) },
  ],
})

export async function loadProjectStats(year?: string, socid?: string): Promise<StatsView> {
  const d = await fapiGet<{ year: number; nb_by_month: Monthly[]; amount_by_month: Monthly[]; weighted_by_month: Monthly[]; by_year: Row[] }>('/projet/fapi/stats.php', { year: year || undefined, socid: socid || undefined })
  return {
    yearOptions: yearChoices(d.year, d.by_year),
    selectedYear: String(d.year),
    table: {
      headers: ['Year', 'Number of projects', 'Lead amount', 'Average lead amount', 'Weighted lead amount'],
      rows: d.by_year.map((r) => [first(r, 'year'), first(r, 'nb', 'count', 'number', 'total'), first(r, 'amount', 'total_amount', 'lead_amount'), first(r, 'average', 'avg', 'average_amount'), first(r, 'weighted', 'weighted_amount')]),
    },
    charts: [chart('No. of created projects by month', d.nb_by_month, d.year), chart('Lead amount by month', d.amount_by_month, d.year), chart('Weighted lead amount by month', d.weighted_by_month, d.year)],
  }
}

export async function loadTaskStats(year?: string): Promise<StatsView> {
  const d = await fapiGet<{ year: number; nb_by_month: Monthly[]; by_year: Row[] }>('/projet/fapi/task_stats.php', { year: year || undefined })
  return {
    yearOptions: yearChoices(d.year, d.by_year),
    selectedYear: String(d.year),
    table: { headers: ['Year', 'Number of tasks'], rows: d.by_year.map((r) => [first(r, 'year'), first(r, 'nb', 'count', 'number', 'total')]) },
    charts: [chart('No. of created tasks by month', d.nb_by_month, d.year)],
  }
}

// projet/fapi/time_spent.php?year=&mode=month|week -> {year, mode, buckets [{bucket, label, duration_seconds, duration_hours, entries}], by_user [], totals {duration_seconds,
// duration_hours, entries}, basis}; it sums llx_projet_task_time for the year ("mirrors projet/activity/permonth.php"): the classic grid under it (tasks assigned to
// the user, the time typed per day) is not in this answer. by_user rows have not been seen (empty).
export interface TimeSpentSummary {
  year: number
  mode: 'month' | 'week'
  buckets: Array<{ bucket: number; label: string; duration_hours: number; entries: number }>
  by_user: Row[]
  totals: { duration_hours: number; entries: number }
}

export const loadTimeSpentSummary = (mode: 'month' | 'week', year: number) => fapiGet<TimeSpentSummary>('/projet/fapi/time_spent.php', { mode, year })
