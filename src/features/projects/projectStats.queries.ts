import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseYearOptions, parseResultsTable, parseEmbeddedCharts, looksLikeLegacyLoginPage, type SelectOption, type StatsResultsTable, type StatsChart } from './statsHtmlParser'

// No REST API exists for project statistics — reads projet/stats/index.php
// directly (see statsHtmlParser.ts's header comment for how the embedded
// Chart.js data is extracted). Verified live against the real backend.
// `socid` is the real GETPOSTINT('socid') this page's own PHP reads (see
// projet/stats/index.php — it feeds $stats_project->socid) — a genuine
// query param, not scraped; the Third-party dropdown itself is populated
// from this app's own real /api/customers/ list (see useCustomerOptions in
// customerOptions.ts) rather than scraping this page's own third-party
// widget, since Dolibarr's select_company() can render as an AJAX-search
// input with no static <option> list in the DOM at all.

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Project statistics have no usable REST API and read the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

export interface ProjectStats {
  yearOptions: SelectOption[]
  table: StatsResultsTable | null
  charts: StatsChart[]
}

export function useProjectStats(year?: string, socid?: string) {
  return useQuery({
    queryKey: ['projects', 'stats', year ?? '', socid ?? ''],
    queryFn: async (): Promise<ProjectStats> => {
      const params = new URLSearchParams({ mainmenu: 'projectmanagement', leftmenu: '' })
      if (year) params.set('year', year)
      if (socid) params.set('socid', socid)
      const doc = await fetchLegacyDocument('/projet/stats/index.php', params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return { yearOptions: parseYearOptions(doc), table: parseResultsTable(doc, 'Year'), charts: parseEmbeddedCharts(doc) }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
