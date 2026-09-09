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

export interface VendorProposalStatsFilters {
  year?: string
  socid?: string
  typentId?: string
  categId?: string
  userid?: string
}

// Real GETPOST params confirmed by reading comm/propal/stats/index.php
// directly: socid (Third-party), typent_id (Third-party type), categ_id
// (Tag/category vendor), userid (Created by), year.
export function useVendorProposalStats(filters: VendorProposalStatsFilters) {
  return useQuery({
    queryKey: ['projects', 'vendorProposalStats', filters],
    queryFn: async (): Promise<VendorProposalStats> => {
      const params = new URLSearchParams({ mode: 'supplier', mainmenu: 'projectmanagement', leftmenu: '' })
      if (filters.year) params.set('year', filters.year)
      if (filters.socid) params.set('socid', filters.socid)
      if (filters.typentId) params.set('typent_id', filters.typentId)
      if (filters.categId) params.set('categ_id', filters.categId)
      if (filters.userid) params.set('userid', filters.userid)
      const doc = await fetchLegacyDocument('/comm/propal/stats/index.php', params)
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return { yearOptions: parseYearOptions(doc), table: parseResultsTable(doc, 'Year'), charts: parseEmbeddedCharts(doc) }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}
