import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { hhmm, type FapiTimeSpent, type TimeSpentPeriod } from '../users/timeSpentFapi'

// The Time Spent grids (Input per month / week / day) from userprofile/fapi/time_spent.php, the same JSON the HRM timesheet reads. It
// replaces the reader of the classic projet/activity/per{month,week,day}.php pages, which parsed their HTML table.
// Checked 13 Nov 2026 (GET, 200 on newecuenta and 5.10): period {mode, start, end, day_columns}, rows [], totals. Neither server has a task, so
// the row fields are the ones the API document gives (see timeSpentFapi.ts), not a row seen live.
// What the JSON does not carry, and the grid therefore leaves out: the day tab's "Start hour" and "Note" boxes (it gives the seconds of the day
// only), the "Expected worked hours per week" figure of the week tab's total row, and the project line grouping of the classic rows.

export type TimeSpentMode = 'month' | 'week' | 'day'

export interface TimeSpentGridRow {
  cells: string[]
  // "PJ2610-0002 - ERP rollout", printed under the task.
  project: string
}

export interface TimeSpentGrid {
  extraHeaders: string[]
  rows: TimeSpentGridRow[]
  // The Total row: label, two blanks, the time of everybody, your time, then one cell per extra column.
  totalCells: string[]
  noticeText: string
  emptyMessage: string | null
}

// Printed by every one of the three classic pages.
const NOTICE =
  'This view is limited to projects or tasks you are a contact for. Only open projects are visible (projects in draft or closed status are not visible).' +
  'Only tasks assigned to you are visible. Assign task to yourself if it is not visible and you need to enter time on it.'
const EMPTY = 'No assigned tasks found (assign project/tasks to the current user from the top select box to enter time on it)'

const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "2026-11-09" -> a date at noon UTC, so no time zone moves it to another day.
const dayOf = (iso: string) => new Date(`${iso}T12:00:00Z`)

function isoWeek(iso: string): number {
  const d = dayOf(iso)
  const dow = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dow)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
}

// "Mon 11/09/26": the weekday and the date, in the month / day / year order of newecuenta's classic pages.
function dayHeader(iso: string): string {
  const d = dayOf(iso)
  return `${WEEKDAYS[d.getUTCDay()]} ${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${String(d.getUTCFullYear()).slice(2)}`
}

// A zero is a blank box on the classic page.
const time = (seconds: number) => (seconds > 0 ? hhmm(seconds) : '')

// "Week 44(01...01)": the month tab has one column per ISO week, with the first and last day of the month that fall in it. The classic page
// (core/lib/date.lib.php getWeekNumbersOfMonth) looks at the days 1 to N-1 only and stretches its last column to day N, so a month that ends on
// the Monday of a new week (November 2026: the 30th) shows "Week 48(23...30)", not a column of one day.
export function weekGroups(dayColumns: string[]): { label: string; days: string[] }[] {
  const groups: { week: number; days: string[] }[] = []
  for (const day of dayColumns.slice(0, -1)) {
    const week = isoWeek(day)
    const last = groups[groups.length - 1]
    if (last && last.week === week) last.days.push(day)
    else groups.push({ week, days: [day] })
  }
  const lastDay = dayColumns[dayColumns.length - 1]
  if (lastDay && groups.length) groups[groups.length - 1].days.push(lastDay)
  return groups.map((g) => ({ label: `Week ${g.week}(${g.days[0].slice(8)}...${g.days[g.days.length - 1].slice(8)})`, days: g.days }))
}

const n = (v: unknown) => (typeof v === 'number' ? v : 0)
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export function buildTimeSpentGrid(mode: TimeSpentMode, d: FapiTimeSpent): TimeSpentGrid {
  const dayColumns = d.period.day_columns
  const columns: { header: string; days: string[] }[] =
    mode === 'month'
      ? weekGroups(dayColumns).map((g) => ({ header: g.label, days: g.days }))
      : mode === 'week'
        ? dayColumns.map((day) => ({ header: dayHeader(day), days: [day] }))
        : [{ header: 'Duration', days: dayColumns }]
  const sum = (days: Record<string, number>, of: string[]) => of.reduce((a, day) => a + (days[day] ?? 0), 0)
  const dayTotals: Record<string, number> = {}
  const rows = d.rows.map((r): TimeSpentGridRow => {
    const days = (r.days ?? {}) as Record<string, number>
    for (const [day, sec] of Object.entries(days)) dayTotals[day] = (dayTotals[day] ?? 0) + sec
    return {
      project: [str(r.project_ref), str(r.project_label)].filter(Boolean).join(' - '),
      cells: [
        [str(r.task_ref), str(r.task_label)].filter(Boolean).join(' - '),
        time(n(r.planned_workload_seconds)),
        r.progress === null || r.progress === undefined ? '' : `${r.progress}%`,
        time(n(r.time_spent_everybody_seconds)),
        time(n(r.time_spent_you_seconds)),
        ...columns.map((c) => time(sum(days, c.days))),
      ],
    }
  })
  return {
    extraHeaders: columns.map((c) => c.header),
    rows,
    totalCells: ['Total', '', '', time(d.totals.time_spent_everybody_seconds), time(d.totals.time_spent_you_seconds), ...columns.map((c) => time(sum(dayTotals, c.days)))],
    noticeText: NOTICE,
    emptyMessage: rows.length ? null : EMPTY,
  }
}

const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// `date` picks which month / week / day to view.
export function useTimeSpentGrid(mode: TimeSpentMode, date: Date) {
  const day = isoLocal(date)
  return useQuery({
    queryKey: ['projects', 'timeSpent', mode, day],
    queryFn: async (): Promise<TimeSpentGrid> => buildTimeSpentGrid(mode, await fapiGet<FapiTimeSpent>('/userprofile/fapi/time_spent.php', { period: mode satisfies TimeSpentPeriod, date: day })),
    staleTime: 1000 * 30,
    retry: false,
  })
}
