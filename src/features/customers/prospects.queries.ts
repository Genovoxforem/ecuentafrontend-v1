import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface ProspectsSummary {
  totalCustomers: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCustomers: number
  otherCountryCustomers: number
  customers: ThirdPartyRow[]
}

// Same real endpoints as customers.queries.ts, just with type=p — prospects
// aren't a separate backend resource, they're societe rows with client=2 (or
// 3 for customer+prospect), and both api/customers/summary/ and
// api/customers/list/ already branch on this same type param. See
// customers.queries.ts for the full field-by-field confirmation.
interface SummaryPayload {
  total: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCount: number
  otherCountryCount: number
}

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

function toRow(item: ListItem): ThirdPartyRow {
  return {
    id: item.id,
    name: item.name ?? '',
    country: item.countryLabel ?? '',
    outstandingBalance: item.outstandingBalance,
    tpin: item.tpin ?? '',
    salesRep: item.salesReps ?? '',
    email: item.email ?? '',
    phone: item.phone ?? '',
    nature: item.isCustomer && item.isProspect ? 'Customer, Prospect' : 'Prospect',
    trackingId: item.trackingId ?? '',
    creationDate: item.createdAt ?? '',
    creatorName: item.creatorName ?? '',
    status: item.statusLabel === 'Open' ? 'Active' : 'Inactive',
  }
}

export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const [summaryRes, listRes] = await Promise.all([
        api.get<WebEnvelope<SummaryPayload>>('/customers/summary/', { params: { type: 'p' } }),
        api.get<WebEnvelope<{ items: ListItem[]; total: number }>>('/customers/list/', { params: { type: 'p', page: 1, limit: 500 } }),
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
    // Same permanently-missing endpoints as customers.queries.ts — retrying
    // a 404 is pointless.
    retry: false,
  })
}
