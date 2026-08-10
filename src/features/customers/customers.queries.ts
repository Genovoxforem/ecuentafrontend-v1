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

// GET /api/customers/summary/ (api/customers/summary/index.php) — purpose-built
// for this exact stat-card row (Total, Created This Month, Outstanding Balance,
// Default/Other Country counts), computed server-side straight from
// llx_societe/llx_facture rather than derived client-side from a row list that
// doesn't carry enough fields for it.
interface SummaryPayload {
  total: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCount: number
  otherCountryCount: number
}

// GET /api/customers/list/ (api/customers/list/index.php) — the React-app-
// specific list endpoint (distinct from api/customers/index.php, which serves
// the mobile app with a narrower row shape missing country/balance/sales
// rep/creation date entirely). Both endpoints wrap their payload as
// {success, data: ...}, unlike the mobile endpoint's flat {success, customers, ...}.
interface ListItem {
  id: number
  name: string
  tpin: string | null
  trackingId: string | null
  isCustomer: boolean
  isProspect: boolean
  isVendor: boolean
  statusLabel: 'Open' | 'Closed'
  email: string
  phone: string
  countryLabel: string | null
  currencyCode: string
  outstandingBalance: number
  salesReps: string | null
  createdAt: string
  creatorName: string
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

export function toRow(item: ListItem): ThirdPartyRow {
  return {
    name: item.name ?? '',
    country: item.countryLabel ?? '',
    outstandingBalance: item.outstandingBalance,
    tpin: item.tpin ?? '',
    salesRep: item.salesReps ?? '',
    email: item.email ?? '',
    phone: item.phone ?? '',
    nature: item.isCustomer && item.isProspect ? 'Customer, Prospect' : item.isProspect ? 'Prospect' : 'Customer',
    trackingId: item.trackingId ?? '',
    // Raw MySQL datetime, not pre-formatted — ThirdPartyList both displays
    // this (via formatDateTimeAmPm) and parses it for the date-range filter,
    // so it needs to stay a real parseable timestamp, not display text.
    creationDate: item.createdAt ?? '',
    creatorName: item.creatorName ?? '',
    status: item.statusLabel === 'Open' ? 'Active' : 'Inactive',
  }
}

// limit: 500 — web_pagination()'s own clamp ceiling (see api/_web_common.php)
// — fetched once and paginated client-side by ThirdPartyList, same pattern
// used for every other list page in this app.
export function useCustomersSummary() {
  return useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: async (): Promise<CustomersSummary> => {
      const [summaryRes, listRes] = await Promise.all([
        api.get<WebEnvelope<SummaryPayload>>('/customers/summary/'),
        api.get<WebEnvelope<{ items: ListItem[]; total: number }>>('/customers/list/', { params: { type: 'c', page: 1, limit: 500 } }),
      ])
      const s = summaryRes.data.data
      const rows = listRes.data.data.items.map(toRow)
      return {
        totalCustomers: s.total,
        createdThisMonth: s.createdThisMonth,
        outstandingBalance: s.outstandingBalance,
        defaultCountryCustomers: s.defaultCountryCount,
        otherCountryCustomers: s.otherCountryCount,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
