import { useQuery } from '@tanstack/react-query'
import { fetchThirdParties, fetchThirdPartySummary } from '../../api/customers'
import { fetchAllPages } from '../../api/fapiRow'
import { toThirdPartyRow } from './customers.queries'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface ProspectsSummary {
  totalCustomers: number
  createdThisMonth: number | null
  outstandingBalance: number | null
  defaultCountryCustomers: number | null
  otherCountryCustomers: number | null
  customers: ThirdPartyRow[]
}

/**
 * Prospects list + summary KPIs from societe/fapi/list.php and summary.php (type=prospect).
 */
export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const [items, summary] = await Promise.all([
        fetchAllPages((page) => fetchThirdParties({ type: 'prospect', limit: 100, page, sort: 'name', direction: 'asc' })),
        fetchThirdPartySummary('prospect'),
      ])
      const rows: ThirdPartyRow[] = items.map(toThirdPartyRow)
      return {
        totalCustomers: summary.total ?? rows.length,
        createdThisMonth: summary.created_this_month ?? 0,
        outstandingBalance: summary.outstanding_balance ?? 0,
        defaultCountryCustomers: summary.default_country_parties ?? 0,
        otherCountryCustomers: summary.other_country_parties ?? 0,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
