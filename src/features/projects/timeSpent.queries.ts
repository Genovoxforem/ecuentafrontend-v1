import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'

// Time Spent (Input per week) — projet/activity/perweek.php. No REST API
// exists for this. Read-only for now: the grid table itself (id="tablelines3")
// is real server-rendered HTML with real headers (Task, Planned workload,
// Declared real progress, Time spent Everybody/mine, one column per
// weekday, Total), but wiring Save needs a real assigned-task row on this
// backend to verify the per-cell save field naming against (Dolibarr names
// those dynamically per task id/day) — tracked as a known gap, not guessed.

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Time Spent has no usable REST API and reads the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

export interface TimeSpentRow {
  cells: string[]
}

export interface TimeSpentWeek {
  weekLabel: string
  dayHeaders: string[]
  rows: TimeSpentRow[]
  expectedHoursPerWeek: string
  noticeText: string
  emptyMessage: string | null
}

function cellText(cell: Element | undefined | null): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.getElementById('tablelines3') && !!doc.querySelector('input[name="password"]')
}

export function useTimeSpentWeek(dateParam?: string) {
  return useQuery({
    queryKey: ['projects', 'timeSpent', dateParam ?? ''],
    queryFn: async (): Promise<TimeSpentWeek> => {
      const params = new URLSearchParams({ mainmenu: 'projectmanagement', leftmenu: '' })
      if (dateParam) params.set('re', dateParam)
      const doc = await fetchLegacyDocument('/projet/activity/perweek.php', params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)

      const table = doc.getElementById('tablelines3') as HTMLTableElement | null
      const headerRow = table?.rows[1] ?? null
      // Header cells, in order: Task, Planned workload, Declared real
      // progress, Time spent Everybody, Time spent <me>, Mon..Sun (7), then
      // a hidden column-selector <th> whose own <script> tag leaks into
      // textContent — day headers are exactly indices 5-11, never "the
      // rest" (that selector cell isn't a day and must be excluded).
      const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th')).map(cellText) : []
      const dayHeaders = headerCells.slice(5, 12)

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

      const totalRow = Array.from(table?.rows ?? []).find((tr) => tr.className.includes('totalRow'))
      const expectedMatch = /expected worked hours per week:\s*(\S+)/i.exec(cellText(totalRow ?? undefined))
      const monthName = doc.getElementById('month_name')

      return {
        weekLabel: cellText(monthName),
        dayHeaders,
        rows,
        expectedHoursPerWeek: expectedMatch?.[1] ?? '0',
        noticeText: cellText(doc.querySelector('.hideonsmartphone.opacitymedium')),
        emptyMessage,
      }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
