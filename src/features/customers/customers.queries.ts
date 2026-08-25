import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'
import { parseSocieteListRow, type RawSocieteListRow, type SocieteListRow } from './societeListParser'

export interface CustomersSummary {
  totalCustomers: number
  createdThisMonth: number
  outstandingBalance: number
  defaultCountryCustomers: number
  otherCountryCustomers: number
  customers: ThirdPartyRow[]
}

interface SocieteListResponse {
  ok: boolean
  iTotalRecords: number
  data: RawSocieteListRow[]
}

// This deployment is Zambia-specific throughout (ZRA integration, TPIN/NRC
// fields, ZMW currency) — there is no API exposing a configured "default
// country" to compare against, so this is a hardcoded stand-in for the
// entity's own country on the Default/Other Country stat split.
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
    nature: item.isCustomer && item.isProspect ? 'Customer, Prospect' : item.isProspect ? 'Prospect' : 'Customer',
    trackingId: item.trackingId,
    creationDate: item.creationDateIso,
    creatorName: item.creatorName,
    status: item.statusLabel === 'Open' ? 'Active' : 'Inactive',
  }
}

// societe/api/list.php (DataTables-style POST, see societeListParser.ts) —
// a real, session-cookie-authenticated endpoint, unrelated to the old
// /api/customers/{summary,list}/ routes this used to call (both permanent
// 404s on the currently-active backend). `length: -1` returns every
// matching row in one response (no server-side pagination), which both
// supplies ThirdPartyList's full row set (it paginates client-side, same
// pattern as every other list page in this app) and lets the summary stats
// below be computed client-side from that same row list, since no endpoint
// provides createdThisMonth/balance-sum/country-split directly.
export function useCustomersSummary() {
  return useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: async (): Promise<CustomersSummary> => {
      // societe/api/list.php's real response body (confirmed live) is
      // prefixed with a UTF-8 BOM and a couple of blank lines before the
      // opening "{", even though it sends Content-Type: application/json —
      // axios's automatic JSON transform runs plain JSON.parse() on that,
      // which throws on the leading BOM. Disabling the transform and
      // parsing manually after a trim() (which strips BOM/whitespace alike)
      // sidesteps that rather than depending on a backend fix.
      const res = await axios.post<string>(
        '/societe/api/list.php',
        new URLSearchParams({ draw: '1', start: '0', length: '-1', type: 'c', contextpage: 'customerlist' }),
        { transformResponse: (data) => data },
      )
      const body: SocieteListResponse = JSON.parse(res.data.trim())

      const parsed = body.data.map(parseSocieteListRow)
      const now = new Date()

      const rows: ThirdPartyRow[] = parsed.map(toThirdPartyRow)

      const createdThisMonth = parsed.filter((item) => {
        if (!item.creationDateIso) return false
        const d = new Date(item.creationDateIso)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).length

      const outstandingBalance = parsed.reduce((sum, item) => sum + item.outstandingBalance, 0)
      const defaultCountryCustomers = parsed.filter((item) => item.country === DEFAULT_COUNTRY).length
      const otherCountryCustomers = parsed.length - defaultCountryCustomers

      return {
        totalCustomers: body.iTotalRecords ?? parsed.length,
        createdThisMonth,
        outstandingBalance,
        defaultCountryCustomers,
        otherCountryCustomers,
        customers: rows,
      }
    },
    staleTime: 1000 * 60,
  })
}
