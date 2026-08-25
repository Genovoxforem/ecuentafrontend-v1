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

// GET /api/vendors/summary/ and /api/vendors/list/ (api/vendors/summary|list/index.php)
// — dedicated vendor endpoints, filtered on s.fournisseur = 1 rather than a
// client flag, so pure-vendor companies (client=0, fournisseur=1 — 26 of the
// 28 real vendor rows in this DB) are actually included. The old approach of
// reusing the customer list endpoint's client-based WHERE clause could never
// return those rows no matter what filter was applied client-side, since
// fournisseur is an independent flag, not a third client value — a real
// backend gap, now fixed by giving vendors their own endpoint. Outstanding
// balance here is open *purchase* payables (llx_facture_fourn) — money owed
// TO this vendor — not sales receivables.
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

export function toRow(item: ListItem): ThirdPartyRow {
  return {
    id: item.id,
    name: item.name ?? '',
    country: item.countryLabel ?? '',
    outstandingBalance: item.outstandingBalance,
    tpin: item.tpin ?? '',
    salesRep: item.salesReps ?? '',
    email: item.email ?? '',
    phone: item.phone ?? '',
    nature: item.isCustomer ? 'Vendor, Customer' : 'Vendor',
    trackingId: item.trackingId ?? '',
    creationDate: item.createdAt ?? '',
    creatorName: item.creatorName ?? '',
    status: item.statusLabel === 'Open' ? 'Active' : 'Inactive',
  }
}

export function useVendorsSummary() {
  return useQuery({
    queryKey: ['vendors', 'summary'],
    queryFn: async (): Promise<VendorsSummary> => {
      const [summaryRes, listRes] = await Promise.all([
        api.get<WebEnvelope<SummaryPayload>>('/vendors/summary/'),
        api.get<WebEnvelope<{ items: ListItem[]; total: number }>>('/vendors/list/', { params: { page: 1, limit: 500 } }),
      ])
      const s = summaryRes.data.data
      const rows = listRes.data.data.items.map(toRow)
      return {
        totalVendors: s.total,
        createdThisMonth: s.createdThisMonth,
        outstandingBalance: s.outstandingBalance,
        defaultCountryVendors: s.defaultCountryCount,
        otherCountryVendors: s.otherCountryCount,
        vendors: rows,
      }
    },
    staleTime: 1000 * 60,
    // /vendors/summary/ and /vendors/list/ don't exist on the currently-
    // active backend (see BackendUnavailable.tsx) — a permanent 404, so
    // retrying is pointless.
    retry: false,
  })
}
