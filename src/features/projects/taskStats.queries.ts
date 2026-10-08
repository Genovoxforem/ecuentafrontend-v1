import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseYearOptions, parseSelectedYear, parseResultsTable, parseEmbeddedCharts, looksLikeLegacyLoginPage } from './statsHtmlParser'
import type { ProjectStats } from './projectStats.queries'

// No REST API exists for task statistics — reads projet/tasks/stats/index.php
// directly. Same page shape as project statistics (Year filter, results
// table, embedded Chart.js data), so it reuses statsHtmlParser.ts. Its
// Third-party/User filters are hidden on the real page, only Year is shown.
const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Task statistics have no usable REST API and read the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

export function useTaskStats(year?: string) {
  return useQuery({
    queryKey: ['projects', 'task-stats', year ?? ''],
    queryFn: async (): Promise<ProjectStats> => {
      const params = new URLSearchParams({ mainmenu: 'projectmanagement', leftmenu: '' })
      if (year) params.set('year', year)
      const doc = await fetchLegacyDocument('/projet/tasks/stats/index.php', params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return { yearOptions: parseYearOptions(doc), selectedYear: parseSelectedYear(doc), table: parseResultsTable(doc, 'Year'), charts: parseEmbeddedCharts(doc) }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
