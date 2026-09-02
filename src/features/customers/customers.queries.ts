import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface CustomersSummary {
  totalCustomers: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCustomers: number
  otherCountryCustomers: number
  customers: ThirdPartyRow[]
}

// Raw row from /api/customers/index.php?action=list — mirrors the fields
// /societe/list.php + /societe/api/list.php compute server-side (country,
// sales rep, creation date, creator, status, outstanding balance, tracking),
// but delivered as clean JSON via the bearer-token-authenticated `api` axios
// instance. The old version called /societe/api/list.php directly, which
// requires the DOLSESSID session cookie (only set at login time, missing on
// any resumed session) and returns server-built HTML cells needing
// societeListParser.ts to parse — this endpoint replaces both.
export interface ApiCustomerRow {
  id: number
  name: string
  name_alias: string | null
  code_client: string | null
  code_fournisseur: string | null
  email: string
  phone: string
  address: string
  zip: string
  town: string
  tpin: string | null
  tracking: string | null
  currency: string | null
  client: number
  type: string
  is_supplier: number
  status: number
  country: string
  country_code: string
  date_creation: string | null
  creator_name: string
  sales_rep: string
  outstanding_balance: number
}

interface CustomersListResponse {
  success: boolean
  customers: ApiCustomerRow[]
  total_count: number
}

// Summary response from /api/customers/index.php?action=summary — the KPI
// block from /societe/list.php (total, created this month, outstanding
// balance, default/other country split), computed server-side so the
// numbers always match what the list rows sum to.
interface ThirdPartySummaryResponse {
  success: boolean
  type: string
  total: number
  created_this_month: number
  outstanding_balance: number
  default_country_parties: number
  other_country_parties: number
}

export function toThirdPartyRow(item: ApiCustomerRow): ThirdPartyRow {
  const nature =
    item.type === 'customer_prospect' ? 'Customer, Prospect' :
    item.type === 'prospect' ? 'Prospect' :
    item.is_supplier ? 'Customer, Vendor' : 'Customer'
  return {
    id: item.id,
    name: item.name || '(unnamed)',
    country: item.country || '',
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

// /api/customers/index.php?action=list&type=customer — bearer-token-auth'd
// JSON endpoint (via the `api` axios instance which sends X-API-Key).
// Replaces the old /societe/api/list.php call which required the DOLSESSID
// session cookie (only established at login time, missing on any resumed
// session). Summary stats come from the separate action=summary endpoint
// (server-side KPI computation matching /societe/list.php), so the numbers
// match what the list rows sum to rather than being approximated client-side.
export function useCustomersSummary() {
  return useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: async (): Promise<CustomersSummary> => {
      const [listRes, summaryRes] = await Promise.all([
        api.get<CustomersListResponse>('/customers/index.php', {
          params: { action: 'list', type: 'customer', limit: 1000 },
        }),
        api.get<ThirdPartySummaryResponse>('/customers/index.php', {
          params: { action: 'summary', type: 'customer' },
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
