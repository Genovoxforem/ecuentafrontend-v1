import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { ThirdPartyRow } from '../../shared/components/thirdParty/ThirdPartyList'
import { parseSocieteListRow, type RawSocieteListRow } from './societeListParser'
import { toThirdPartyRow } from './customers.queries'

export interface ProspectsSummary {
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

// Same deployment-wide assumption as customers.queries.ts (no API exposes a
// configured "default country" to compare against).
const DEFAULT_COUNTRY = 'Zambia'

// societe/api/list.php with type=p — the exact same real, working endpoint
// customers.queries.ts already uses for type=c, confirmed live to return
// prospect rows too (recordsTotal: 9 on this backend, each row's cust_type
// HTML carrying a title="Prospect" badge). This used to call
// /api/customers/{summary,list}/?type=p, both permanent 404s on the
// currently-active backend — see customers.queries.ts's own header comment
// for the full BOM/parsing details this mirrors.
export function useProspectsSummary() {
  return useQuery({
    queryKey: ['customers', 'summary', 'prospects'],
    queryFn: async (): Promise<ProspectsSummary> => {
      const res = await axios.post<string>(
        '/societe/api/list.php',
        new URLSearchParams({ draw: '1', start: '0', length: '-1', type: 'p', contextpage: 'prospectlist' }),
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
