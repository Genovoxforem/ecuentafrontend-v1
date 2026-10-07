import { useQuery } from '@tanstack/react-query'
import {
  fetchThirdParties,
  fetchThirdPartySummary,
} from '../../api/customers'
import { toThirdPartyRow } from './customers.queries'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface ProspectsSummary {
  totalCustomers: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCustomers: number
  otherCountryCustomers: number
  customers: ThirdPartyRow[]
}

/**
 * Prospects list + summary KPIs.
 *
 * Uses the bearer-token-authenticated fapi endpoints:
 *   GET /societe/fapi/list.php?type=prospect
 *   GET /societe/fapi/summary.php?type=prospect
 *
 * These wrap the existing Dolibarr Societe business class and replicate
 * /societe/list.php?type=p's server-side KPI computation.
 */
export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const [listData, summary] = await Promise.all([
        fetchThirdParties({ type: 'prospect', limit: 100, sort: 'name', direction: 'asc' }),
        fetchThirdPartySummary('prospect'),
      ])
      const rows: ThirdPartyRow[] = listData.items.map(toThirdPartyRow)

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
