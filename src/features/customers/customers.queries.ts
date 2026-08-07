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

// GET /api/customers/ (api/customers/index.php on the real backend, read
// directly — see buildCustomerRow()). This confirms the row shape exactly:
// id, name, name_alias, code_client, email, phone, address, zip, town,
// tpin, currency, client, type ('customer'|'customer_prospect'|'prospect'),
// is_supplier. Notably absent: country, outstanding balance, sales rep, and
// creation date aren't returned by this endpoint at all (balance requires a
// separate per-customer facture join the list doesn't do) — those stats
// below stay honest zeros rather than the wrong guesses this used to compute
// from fields that were never actually in the response.
interface RawCustomer {
  id: number
  name: string
  name_alias: string | null
  code_client: string | null
  email: string
  phone: string
  address: string
  zip: string
  town: string
  tpin: string | null
  currency: string | null
  client: number
  type: 'customer' | 'customer_prospect' | 'prospect'
  is_supplier: number
}

interface CustomersResponse {
  success: boolean
  customers: RawCustomer[]
  total_count: number
}

function toRow(raw: RawCustomer): ThirdPartyRow {
  return {
    name: raw.name ?? '',
    // Not returned by this endpoint — see comment above.
    country: '',
    outstandingBalance: 0,
    tpin: raw.tpin ?? '',
    salesRep: '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    nature: raw.type === 'prospect' ? 'Prospect' : 'Customer',
    trackingId: raw.code_client ?? '',
    creationDate: '',
    // No status/closed flag on this endpoint's row either — everything
    // returned is by definition an active record, so this isn't a guess.
    status: 'Active',
  }
}

// GET /api/customers/?type=customer — real, confirmed live. Vendors reuse
// this same endpoint (client-side filtered on is_supplier) — see
// vendors.queries.ts for why type=supplier doesn't work server-side.
export function useCustomersSummary() {
  return useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: async (): Promise<CustomersSummary> => {
      const { data } = await api.get<CustomersResponse>('/customers/', { params: { type: 'customer', limit: 250 } })
      const rows = (data.customers ?? []).map(toRow)
      return {
        totalCustomers: data.total_count ?? rows.length,
        // Not computable — no creation date on this endpoint.
        createdThisMonth: 0,
        // Not computable — no balance on this endpoint (would need a
        // separate facture-join call per customer).
        outstandingBalance: 0,
        // Not computable — no country field on this endpoint at all.
        defaultCountryCustomers: 0,
        otherCountryCustomers: 0,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
