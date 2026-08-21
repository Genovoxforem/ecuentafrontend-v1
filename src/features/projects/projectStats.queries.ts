import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseYearOptions, parseResultsTable, parseEmbeddedCharts, looksLikeLegacyLoginPage, type SelectOption, type StatsResultsTable, type StatsChart } from './statsHtmlParser'

// No REST API exists for project statistics — reads projet/stats/index.php
// directly (see statsHtmlParser.ts's header comment for how the embedded
// Chart.js data is extracted). Verified live against the real backend.

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Project statistics have no usable REST API and read the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

export interface ProjectStats {
  yearOptions: SelectOption[]
  table: StatsResultsTable | null
  charts: StatsChart[]
}

export function useProjectStats(year?: string) {
  return useQuery({
    queryKey: ['projects', 'stats', year ?? ''],
    queryFn: async (): Promise<ProjectStats> => {
      const params = new URLSearchParams({ mainmenu: 'projectmanagement', leftmenu: '' })
      if (year) params.set('year', year)
      const doc = await fetchLegacyDocument('/projet/stats/index.php', params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return { yearOptions: parseYearOptions(doc), table: parseResultsTable(doc, 'Year'), charts: parseEmbeddedCharts(doc) }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
