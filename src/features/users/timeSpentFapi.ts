import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// The HRM timesheet (classic Time Spent Details) on userprofile/fapi/time_spent.php (26 Oct 2026): the tasks of the user with the planned
// workload, the progress, the time spent by everybody and by the user, and the seconds spent on each day of the chosen period. It needs the
// project module. newecuenta has no project or task, so rows is empty there and the row is the document's own shape ("from code").
// Entering time has no fapi writer, so the time boxes are shown but cannot be edited.

export type TimeSpentPeriod = 'day' | 'week' | 'month'

type Row = Record<string, unknown>
export interface FapiTimeSpent {
  period: { mode: string; start: string; end: string; day_columns: string[] }
  rows: Row[]
  totals: { time_spent_you_seconds: number; time_spent_everybody_seconds: number }
}
export interface TimeSpentRow {
  taskId: number
  task: string
  project: string
  planned: string
  progress: string
  everybody: string
  you: string
  days: Record<string, string>
}
export interface TimeSpentData {
  start: string
  end: string
  dayColumns: string[]
  rows: TimeSpentRow[]
  everybody: string
  you: string
  dayTotals: Record<string, string>
}

const n = (v: unknown) => (typeof v === 'number' ? v : 0)
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
// seconds as hh:mm, the way the classic page prints a duration
export const hhmm = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}`

export function mapTimeSpent(d: FapiTimeSpent): TimeSpentData {
  const dayTotal: Record<string, number> = {}
  const rows = d.rows.map((r): TimeSpentRow => {
    const days = (r.days ?? {}) as Record<string, number>
    for (const [date, sec] of Object.entries(days)) dayTotal[date] = (dayTotal[date] ?? 0) + sec
    return {
      taskId: n(r.task_id),
      task: [s(r.task_ref), s(r.task_label)].filter(Boolean).join(' - '),
      project: [s(r.project_ref), s(r.project_label)].filter(Boolean).join(' - '),
      planned: hhmm(n(r.planned_workload_seconds)),
      progress: r.progress === null || r.progress === undefined ? '' : `${r.progress}%`,
      everybody: hhmm(n(r.time_spent_everybody_seconds)),
      you: hhmm(n(r.time_spent_you_seconds)),
      days: Object.fromEntries(Object.entries(days).map(([date, sec]) => [date, hhmm(sec)])),
    }
  })
  return {
    start: d.period.start,
    end: d.period.end,
    dayColumns: d.period.day_columns,
    rows,
    everybody: hhmm(d.totals.time_spent_everybody_seconds),
    you: hhmm(d.totals.time_spent_you_seconds),
    dayTotals: Object.fromEntries(Object.entries(dayTotal).map(([date, sec]) => [date, hhmm(sec)])),
  }
}
export const loadTimeSpent = async (period: TimeSpentPeriod, date: string) => mapTimeSpent(await fapiGet<FapiTimeSpent>('/userprofile/fapi/time_spent.php', { period, date }))

export const useTimeSpent = (period: TimeSpentPeriod, date: string) => useQuery({ queryKey: ['users', 'timeSpent', period, date], queryFn: () => loadTimeSpent(period, date) })
