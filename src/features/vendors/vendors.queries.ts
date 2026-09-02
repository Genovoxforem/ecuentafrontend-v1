import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'
import type { ApiCustomerRow } from '../customers/customers.queries'

export interface VendorsSummary {
  totalVendors: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryVendors: number
  otherCountryVendors: number
  vendors: ThirdPartyRow[]
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

// Vendor-specific nature label — a vendor that's also flagged as a customer
// (client IN 1,3) shows "Vendor, Customer", otherwise just "Vendor". The
// backend's `type` field is derived from `client` only (prospect/customer/
// customer_prospect), so for vendors we check `client` directly to detect
// the customer flag.
export function toThirdPartyRow(item: ApiCustomerRow): ThirdPartyRow {
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

// /api/customers/index.php?action=list&type=vendor — same bearer-token-
// authenticated endpoint as customers.queries.ts, filtered to vendors
// (fournisseur=1). Summary stats come from action=summary&type=vendor,
// computed server-side to match /societe/list.php's KPI block (including
// the vendor-specific outstanding balance from facture_fourn, not facture).
// Replaces the old /societe/api/list.php?type=f call which required the
// DOLSESSID session cookie.
export function useVendorsSummary() {
  return useQuery({
    queryKey: ['vendors', 'summary'],
    queryFn: async (): Promise<VendorsSummary> => {
      const [listRes, summaryRes] = await Promise.all([
        api.get<CustomersListResponse>('/customers/index.php', {
          params: { action: 'list', type: 'vendor', limit: 1000 },
        }),
        api.get<ThirdPartySummaryResponse>('/customers/index.php', {
          params: { action: 'summary', type: 'vendor' },
        }),
      ])
      const parsed = listRes.data.customers ?? []
      const vendors: ThirdPartyRow[] = parsed.map(toThirdPartyRow)

      return {
        totalVendors: summaryRes.data.total ?? parsed.length,
        createdThisMonth: summaryRes.data.created_this_month ?? 0,
        outstandingBalance: summaryRes.data.outstanding_balance ?? 0,
        defaultCountryVendors: summaryRes.data.default_country_parties ?? 0,
        otherCountryVendors: summaryRes.data.other_country_parties ?? 0,
        vendors,
      }
    },
    staleTime: 1000 * 60,
  })
}
