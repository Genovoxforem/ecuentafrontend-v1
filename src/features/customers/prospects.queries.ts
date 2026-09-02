import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'
import { toThirdPartyRow, type ApiCustomerRow } from './customers.queries'

export interface ProspectsSummary {
  totalCustomers: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCustomers: number
  otherCountryCustomers: number
  customers: ThirdPartyRow[]
}

interface CustomersListResponse {
  success: boolean
  customers: ApiCustomerRow[]
  total_count: number
}

interface ThirdPartySummaryResponse {
  success: boolean
  type: string
  total: number
  created_this_month: number
  outstanding_balance: number
  default_country_parties: number
  other_country_parties: number
}

// /api/customers/index.php?action=list&type=prospect — same bearer-token-
// authenticated endpoint as customers.queries.ts, filtered to prospects
// (client=2). Summary stats come from action=summary&type=prospect, computed
// server-side to match /societe/list.php's KPI block. Replaces the old
// /societe/api/list.php call which required the DOLSESSID session cookie.
export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const [listRes, summaryRes] = await Promise.all([
        api.get<CustomersListResponse>('/customers/index.php', {
          params: { action: 'list', type: 'prospect', limit: 1000 },
        }),
        api.get<ThirdPartySummaryResponse>('/customers/index.php', {
          params: { action: 'summary', type: 'prospect' },
        }),
      ])
      const parsed = listRes.data.customers ?? []
      const rows: ThirdPartyRow[] = parsed.map(toThirdPartyRow)

      return {
        totalCustomers: summaryRes.data.total ?? parsed.length,
        createdThisMonth: summaryRes.data.created_this_month ?? 0,
        outstandingBalance: summaryRes.data.outstanding_balance ?? 0,
        defaultCountryCustomers: summaryRes.data.default_country_parties ?? 0,
        otherCountryCustomers: summaryRes.data.other_country_parties ?? 0,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
