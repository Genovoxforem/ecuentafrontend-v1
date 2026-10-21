import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { toCustomerListRow, type CustomerListApiResponse } from './customers.queries'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface ProspectsSummary {
  totalCustomers: number
  createdThisMonth: number | null
  outstandingBalance: number | null
  defaultCountryCustomers: number | null
  otherCountryCustomers: number | null
  customers: ThirdPartyRow[]
}

const PAGE_SIZE = 250

/**
 * Prospects list + summary KPIs.
 *
 * Reads /api/customers/?type=prospect — the same endpoint the Customers list
 * uses. The Societe fapi list/summary routes (/societe/fapi/list.php,
 * summary.php) are 404 on the active backend, which left this page empty.
 * That endpoint has no KPI summary, so the KPIs derivable from the rows are
 * computed here (only when every row was loaded) and the default-country
 * split, which needs the company country, stays unavailable.
 */
export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const { data } = await api.get<CustomerListApiResponse>('/customers/', {
        params: { type: 'prospect', limit: PAGE_SIZE },
      })
      const items = data.customers ?? []
      const rows: ThirdPartyRow[] = items.map((item) => ({
        ...toCustomerListRow(item),
        nature: item.type === 'customer_prospect' ? 'Customer, Prospect' : 'Prospect',
      }))
      const total = data.total_count ?? rows.length
      const complete = rows.length >= total
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      return {
        totalCustomers: total,
        createdThisMonth: complete ? rows.filter((row) => row.creationDate.startsWith(month)).length : null,
        outstandingBalance: complete ? rows.reduce((sum, row) => sum + row.outstandingBalance, 0) : null,
        defaultCountryCustomers: null,
        otherCountryCustomers: null,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
