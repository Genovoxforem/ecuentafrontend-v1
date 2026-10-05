import { useQuery } from '@tanstack/react-query'
import {
  fetchThirdParties,
  fetchThirdPartySummary,
  type ThirdPartyRow as FapiThirdPartyRow,
} from '../../api/customers'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface VendorsSummary {
  totalVendors: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryVendors: number
  otherCountryVendors: number
  vendors: ThirdPartyRow[]
}

/**
 * Vendor-specific nature label — a vendor that's also flagged as a customer
 * (client IN 1,3) shows "Vendor, Customer", otherwise just "Vendor". The
 * backend's `type` field is derived from `client` only, so for vendors we
 * check `client` directly to detect the customer flag.
 */
export function toThirdPartyRow(item: FapiThirdPartyRow): ThirdPartyRow {
  const isAlsoCustomer = item.client === 1 || item.client === 3
  return {
    id: item.id,
    name: item.name || '(unnamed)',
    country: item.country || '',
    outstandingBalance: item.outstanding_balance ?? 0,
    tpin: item.tpin ?? '',
    salesRep: item.sales_rep || '',
    email: item.email || '',
    phone: item.phone || '',
    nature: isAlsoCustomer ? 'Vendor, Customer' : 'Vendor',
    trackingId: item.tracking ?? item.code_client ?? '',
    creationDate: item.date_creation ?? '',
    creatorName: item.creator_name || '',
    status: item.status === 1 ? 'Active' : 'Inactive',
  }
}

/**
 * Vendors list + summary KPIs.
 *
 * Uses the bearer-token-authenticated fapi endpoints:
 *   GET /societe/fapi/list.php?type=vendor
 *   GET /societe/fapi/summary.php?type=vendor
 *
 * These wrap the existing Dolibarr Societe business class and replicate
 * /societe/list.php?type=f's server-side KPI computation, including the
 * vendor-specific outstanding balance from facture_fourn (purchase invoices),
 * not facture (sales invoices).
 */
export function useVendorsSummary() {
  return useQuery({
    queryKey: ['vendors', 'summary'],
    queryFn: async (): Promise<VendorsSummary> => {
      const [listData, summary] = await Promise.all([
        fetchThirdParties({ type: 'vendor', limit: 100, sort: 'name', direction: 'asc' }),
        fetchThirdPartySummary('vendor'),
      ])
      const vendors: ThirdPartyRow[] = listData.items.map(toThirdPartyRow)

      return {
        totalVendors: summary.total ?? vendors.length,
        createdThisMonth: summary.created_this_month ?? 0,
        outstandingBalance: summary.outstanding_balance ?? 0,
        defaultCountryVendors: summary.default_country_parties ?? 0,
        otherCountryVendors: summary.other_country_parties ?? 0,
        vendors,
      }
    },
    staleTime: 1000 * 60,
  })
}
