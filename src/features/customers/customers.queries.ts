import { useQuery } from '@tanstack/react-query'
import type { ThirdPartyRow as FapiThirdPartyRow } from '../../api/customers'
import { fetchThirdParties, fetchThirdPartySummary } from '../../api/customers'
import { fetchAllPages } from '../../api/fapiRow'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface CustomersSummary {
  totalCustomers: number
  createdThisMonth: number | null
  outstandingBalance: number | null
  defaultCountryCustomers: number | null
  otherCountryCustomers: number | null
  customers: ThirdPartyRow[]
}

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
 * Customers list + summary KPIs from the key-authenticated fapi (the same endpoints the vendors list uses):
 *   GET /societe/fapi/list.php?type=customer   (paged, 100 a page)
 *   GET /societe/fapi/summary.php?type=customer
 */
export function useCustomersSummary() {
  return useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: async ({ signal }): Promise<CustomersSummary> => {
      const [items, summary] = await Promise.all([
        fetchAllPages((page) => fetchThirdParties({ type: 'customer', limit: 100, page, sort: 'name', direction: 'asc' }, signal)),
        fetchThirdPartySummary('customer', signal),
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
