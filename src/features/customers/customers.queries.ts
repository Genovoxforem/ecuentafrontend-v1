import { useQuery } from '@tanstack/react-query'
import {
  fetchThirdParties,
  fetchThirdPartySummary,
  type ThirdPartyRow as FapiThirdPartyRow,
} from '../../api/customers'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface CustomersSummary {
  totalCustomers: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCustomers: number
  otherCountryCustomers: number
  customers: ThirdPartyRow[]
}

/**
 * Map a fapi ThirdPartyRow (rich JSON from /societe/fapi/list.php) to the
 * shared ThirdPartyRow shape consumed by ThirdPartyList.
 */
export function toThirdPartyRow(item: FapiThirdPartyRow): ThirdPartyRow {
  const nature =
    item.type === 'customer_prospect' ? 'Customer, Prospect' :
    item.type === 'prospect' ? 'Prospect' :
    item.is_supplier ? 'Customer, Vendor' : 'Customer'
  return {
    id: item.id,
    name: item.name || '(unnamed)',
    country: item.country || '',
    countryCode: item.country_code || undefined,
    outstandingBalance: item.outstanding_balance ?? 0,
    tpin: item.tpin ?? '',
    salesRep: item.sales_rep || '',
    email: item.email || '',
    phone: item.phone || '',
    nature,
    trackingId: item.tracking ?? item.code_client ?? '',
    creationDate: item.date_creation ?? '',
    creatorName: item.creator_name || '',
    status: item.status === 1 ? 'Active' : 'Inactive',
  }
}

/**
 * Customers list + summary KPIs.
 *
 * Uses the bearer-token-authenticated fapi endpoints:
 *   GET /societe/fapi/list.php?type=customer
 *   GET /societe/fapi/summary.php?type=customer
 *
 * These wrap the existing Dolibarr Societe business class and replicate
 * /societe/list.php?type=c's server-side KPI computation (total, created
 * this month, outstanding balance from facture, default/other country split).
 */
export function useCustomersSummary() {
  return useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: async (): Promise<CustomersSummary> => {
      const [listData, summary] = await Promise.all([
        fetchThirdParties({ type: 'customer', limit: 100, sort: 'name', direction: 'asc' }),
        fetchThirdPartySummary('customer'),
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
