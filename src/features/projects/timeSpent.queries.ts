import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'

// Time Spent — projet/activity/per{month,week,day}.php. No REST API exists
// for any of the three; all three share the exact same real structure
// (confirmed by reading all three files directly): the same id="tablelines3"
// grid, the same 5 fixed leading columns (Task, Planned workload, Declared
// real progress, Time spent Everybody, Time spent <me>) before the
// mode-specific columns (weekdays / days-of-month / Start Hour+Duration+Note),
// and the same day/month/year GET params for navigation (perweek.php
// L56-58, permonth.php L53-54, perday.php L58) — so one generic reader
// covers all three instead of three near-duplicate scrapers. Read-only for
// now: wiring Save needs a real assigned-task row on this backend to verify
// the per-cell save field naming against (Dolibarr names those dynamically
// per task id/day) — tracked as a known gap, not guessed.

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Time Spent has no usable REST API and reads the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

export type TimeSpentMode = 'month' | 'week' | 'day'

const MODE_PATH: Record<TimeSpentMode, string> = {
  month: '/projet/activity/permonth.php',
  week: '/projet/activity/perweek.php',
  day: '/projet/activity/perday.php',
}

export interface TimeSpentRow {
  cells: string[]
}

export interface TimeSpentGrid {
  extraHeaders: string[]
  rows: TimeSpentRow[]
  totalRowText: string
  noticeText: string
  emptyMessage: string | null
}

function cellText(cell: Element | undefined | null): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.getElementById('tablelines3') && !!doc.querySelector('input[name="password"]')
}

// `date` picks which month/week/day to view.
export function useTimeSpentGrid(mode: TimeSpentMode, date?: Date) {
  const dateKey = date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : ''
  return useQuery({
    queryKey: ['projects', 'timeSpent', mode, dateKey],
    queryFn: async (): Promise<TimeSpentGrid> => {
      const params = new URLSearchParams({ mainmenu: 'projectmanagement', leftmenu: '' })
      if (date) {
        params.set('day', String(date.getDate()))
        params.set('month', String(date.getMonth() + 1))
        params.set('year', String(date.getFullYear()))
      }
      const doc = await fetchLegacyDocument(MODE_PATH[mode], params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)

      const table = doc.getElementById('tablelines3') as HTMLTableElement | null
      const headerRow = table?.rows[1] ?? null
      // First 5 <th>s are always the fixed columns; the last <th> is always
      // a hidden column-selector whose own <script> tag leaks into
      // textContent (not a real data column) — everything between those is
      // the mode-specific header set (weekdays / days-of-month / Start
      // Hour+Duration+Note), whatever its length.
      const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th')).map(cellText) : []
      const extraHeaders = headerCells.slice(5, headerCells.length - 1)

      const rows: TimeSpentRow[] = []
      let emptyMessage: string | null = null
      if (table) {
        for (const tr of Array.from(table.rows).slice(2)) {
          if (tr.className.includes('totalRow')) continue
          const cells = Array.from(tr.querySelectorAll('td')).map(cellText)
          if (cells.length === 1 && /no assigned tasks/i.test(cells[0])) {
            emptyMessage = cells[0]
            continue
          }
          if (cells.length) rows.push({ cells })
        }
      }

      // The total row's first <td> holds the label+value ("Total - Expected
      // Worked Hours Per Week: 0"); textContent on the whole <tr> also pulls
      // in every per-day/per-hour cell after it, so this reads just that
      // first cell rather than hardcoding "per week" wording that doesn't
      // match the month/day pages' own text.
      const totalRow = Array.from(table?.rows ?? []).find((tr) => tr.className.includes('totalRow'))
      const totalRowText = cellText(totalRow?.querySelector('td'))

      return {
        extraHeaders,
        rows,
        totalRowText,
        noticeText: cellText(doc.querySelector('.hideonsmartphone.opacitymedium')),
        emptyMessage,
      }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
