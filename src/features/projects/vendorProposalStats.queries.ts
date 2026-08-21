import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseYearOptions, parseResultsTable, parseEmbeddedCharts, looksLikeLegacyLoginPage, type SelectOption, type StatsResultsTable, type StatsChart } from './statsHtmlParser'

// No REST API exists for vendor proposal statistics — reads
// comm/propal/stats/index.php?mode=supplier directly, same pattern as
// projectStats.queries.ts. Verified live against the real backend.

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Vendor proposal statistics have no usable REST API and read the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

export interface VendorProposalStats {
  yearOptions: SelectOption[]
  table: StatsResultsTable | null
  charts: StatsChart[]
}

export function useVendorProposalStats(year?: string) {
  return useQuery({
    queryKey: ['projects', 'vendorProposalStats', year ?? ''],
    queryFn: async (): Promise<VendorProposalStats> => {
      const params = new URLSearchParams({ mode: 'supplier', mainmenu: 'projectmanagement', leftmenu: '' })
      if (year) params.set('year', year)
      const doc = await fetchLegacyDocument('/comm/propal/stats/index.php', params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return { yearOptions: parseYearOptions(doc), table: parseResultsTable(doc, 'Year'), charts: parseEmbeddedCharts(doc) }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
