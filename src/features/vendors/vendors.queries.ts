import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'
import { LEGACY_SESSION_EXPIRED_PREFIX } from '../../shared/components/BackendUnavailable'
import { parseSocieteListRow, type RawSocieteListRow, type SocieteListRow } from '../customers/societeListParser'

export interface VendorsSummary {
  totalVendors: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryVendors: number
  otherCountryVendors: number
  vendors: ThirdPartyRow[]
}

interface SocieteListResponse {
  ok: boolean
  iTotalRecords: number
  data: RawSocieteListRow[]
}

// Same Zambia-specific stand-in as customers.queries.ts's DEFAULT_COUNTRY —
// no endpoint exposes a configured "default country" to compare against.
const DEFAULT_COUNTRY = 'Zambia'

export function toThirdPartyRow(item: SocieteListRow): ThirdPartyRow {
  return {
    id: item.socid,
    name: item.name,
    country: item.country,
    outstandingBalance: item.outstandingBalance,
    tpin: item.tpin,
    salesRep: item.salesRep,
    email: item.email,
    phone: item.phone,
    nature: item.isCustomer ? 'Vendor, Customer' : 'Vendor',
    trackingId: item.trackingId,
    creationDate: item.creationDateIso,
    creatorName: item.creatorName,
    status: item.statusLabel === 'Open' ? 'Active' : 'Inactive',
  }
}

// societe/api/list.php?type=f — the exact same real, session-cookie-
// authenticated DataTables endpoint customers.queries.ts's
// useCustomersSummary() uses for type=c, confirmed live to also serve
// vendors under type=f (31 real rows, e.g. "Abinav Traders", "Vendor2").
// The previous version of this file called /vendors/summary/ and
// /vendors/list/ — real-looking but permanently-404 endpoints on this
// backend (same dead-API-namespace class documented in
// BackendUnavailable.tsx) — which is why usePurchasesSummary() (the only
// other consumer of this hook) got stuck on an infinite "Loading…": its
// own `!vendors` check treats "the query permanently errored" the same as
// "still loading" (see that file's fix). Client-side stat computation
// mirrors useCustomersSummary() exactly, for the same reason: no endpoint
// provides createdThisMonth/balance-sum/country-split directly.
export function useVendorsSummary() {
  return useQuery({
    queryKey: ['vendors', 'summary'],
    queryFn: async (): Promise<VendorsSummary> => {
      const res = await axios.post<string>(
        '/societe/api/list.php',
        new URLSearchParams({ draw: '1', start: '0', length: '-1', type: 'f', contextpage: 'vendorlist' }),
        { transformResponse: (data) => data },
      )
      const trimmed = res.data.trim()
      if (trimmed.startsWith('<')) {
        throw new Error(`${LEGACY_SESSION_EXPIRED_PREFIX}societe/api/list.php returned a login page instead of JSON.`)
      }
      const body: SocieteListResponse = JSON.parse(trimmed)

      const parsed = body.data.map(parseSocieteListRow)
      const now = new Date()

      const vendors: ThirdPartyRow[] = parsed.map(toThirdPartyRow)

      const createdThisMonth = parsed.filter((item) => {
        if (!item.creationDateIso) return false
        const d = new Date(item.creationDateIso)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).length

      const outstandingBalance = parsed.reduce((sum, item) => sum + item.outstandingBalance, 0)
      const defaultCountryVendors = parsed.filter((item) => item.country === DEFAULT_COUNTRY).length
      const otherCountryVendors = parsed.length - defaultCountryVendors

      return {
        totalVendors: body.iTotalRecords ?? parsed.length,
        createdThisMonth,
        outstandingBalance,
        defaultCountryVendors,
        otherCountryVendors,
        vendors,
      }
    },
    staleTime: 1000 * 60,
  })
}
