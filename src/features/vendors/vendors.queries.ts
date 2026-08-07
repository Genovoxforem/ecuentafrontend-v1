import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'

export interface VendorsSummary {
  totalVendors: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryVendors: number
  otherCountryVendors: number
  vendors: ThirdPartyRow[]
}

// Same row shape as customers.queries.ts's RawCustomer — see there for the
// full field-by-field confirmation against api/customers/index.php.
interface RawCustomer {
  id: number
  name: string
  code_client: string | null
  email: string
  phone: string
  tpin: string | null
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
    country: '',
    outstandingBalance: 0,
    tpin: raw.tpin ?? '',
    salesRep: '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    nature: 'Vendor',
    trackingId: raw.code_client ?? '',
    creationDate: '',
    status: 'Active',
  }
}

// GET /api/customers/ has no server-side supplier filter despite accepting
// a `type` param — reading api/customers/index.php's handleCustomerList()
// directly: `type` only branches on 'customer' or 'prospect', anything
// else (including 'supplier') falls through to the same "client IN
// (1,2,3)" clause as no filter at all. So this fetches broadly and filters
// client-side on the row's real `is_supplier` flag instead.
//
// Bigger caveat from the same source read: that WHERE clause is always
// "client IN (1,2,3)" (customer/prospect flags), with no OR for
// fournisseur — so a company that is *purely* a supplier (not also a
// customer or prospect) is invisible through this endpoint, full stop.
// This list can only ever show suppliers who are also a customer/prospect.
// That's a real backend gap, not something fixable from here.
export function useVendorsSummary() {
  return useQuery({
    queryKey: ['vendors', 'summary'],
    queryFn: async (): Promise<VendorsSummary> => {
      const { data } = await api.get<CustomersResponse>('/customers/', { params: { type: 'all', limit: 250 } })
      const rows = (data.customers ?? []).filter((c) => c.is_supplier === 1).map(toRow)
      return {
        totalVendors: rows.length,
        createdThisMonth: 0,
        outstandingBalance: 0,
        defaultCountryVendors: 0,
        otherCountryVendors: 0,
        vendors: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
