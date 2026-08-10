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

// Same row shape and same real endpoint as customers.queries.ts's
// RawCustomer/toRow — see there for the full field-by-field confirmation.
// Prospects aren't a separate backend resource; they're customer records
// with type === 'prospect', so this reuses /customers/ and filters
// client-side, same pattern as vendors.queries.ts's is_supplier filter.
interface RawCustomer {
  id: number
  name: string
  code_client: string | null
  email: string
  phone: string
  tpin: string | null
  type: 'customer' | 'customer_prospect' | 'prospect'
}

interface CustomersResponse {
  success: boolean
  customers: RawCustomer[]
  total_count: number
}

function toRow(raw: RawCustomer): ThirdPartyRow {
  return {
    name: raw.name ?? '',
    country: '',
    outstandingBalance: 0,
    tpin: raw.tpin ?? '',
    salesRep: '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    nature: 'Prospect',
    trackingId: raw.code_client ?? '',
    creationDate: '',
    status: 'Active',
  }
}

export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const { data } = await api.get<CustomersResponse>('/customers/', { params: { type: 'all', limit: 250 } })
      const rows = (data.customers ?? []).filter((c) => c.type === 'prospect').map(toRow)
      return {
        totalCustomers: rows.length,
        createdThisMonth: 0,
        outstandingBalance: 0,
        defaultCountryCustomers: 0,
        otherCountryCustomers: 0,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
