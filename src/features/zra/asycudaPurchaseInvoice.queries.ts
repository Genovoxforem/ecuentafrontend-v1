import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { LEGACY_SESSION_EXPIRED_PREFIX } from '../../shared/components/BackendUnavailable'
import { parseSocieteListRow, type RawSocieteListRow } from '../customers/societeListParser'

// The real fourn/facture/asycudapurchase.php page (read directly, not
// guessed) sources its Vendor dropdown from Dolibarr's own
// select_company($societe->id, 'socid', 's.fournisseur=1 AND s.fk_pays !=
// 239', ...) — a server-rendered <select>, no JSON API of its own. But
// societe/api/list.php (the real endpoint already wired for the Customers
// list — see customers.queries.ts) accepts type=4 for "fournisseur=1"
// exactly, and its cust_name/tpin/currency_country cells parse with the
// same societeListParser.ts already used there. That gets every real
// vendor + their real Tpin/registration status without inventing a new
// backend route — filtered client-side to non-Zambia to match the real
// page's own "!= 239" condition (currency_country's parsed .country comes
// from getLibStatut()-adjacent server HTML, same real field, just missing
// the raw country_id the PHP compares against directly).
export interface AsycudaVendorOption {
  id: number
  name: string
  tpin: string
  country: string
}

interface SocieteListResponse {
  ok: boolean
  iTotalRecords: number
  data: RawSocieteListRow[]
}

export function useAsycudaVendorOptions() {
  return useQuery({
    queryKey: ['zra', 'asycuda-purchase', 'vendors'],
    queryFn: async (): Promise<AsycudaVendorOption[]> => {
      const res = await axios.post<string>(
        '/societe/api/list.php',
        new URLSearchParams({ draw: '1', start: '0', length: '-1', type: '4', contextpage: 'vendorlist' }),
        { transformResponse: (data) => data },
      )
      const trimmed = res.data.trim()
      if (trimmed.startsWith('<')) {
        throw new Error(`${LEGACY_SESSION_EXPIRED_PREFIX}societe/api/list.php returned a login page instead of JSON.`)
      }
      const body: SocieteListResponse = JSON.parse(trimmed)
      return body.data
        .map(parseSocieteListRow)
        .filter((row) => row.socid !== null && row.country !== 'Zambia')
        .map((row) => ({ id: row.socid as number, name: row.name, tpin: row.tpin, country: row.country }))
    },
    staleTime: 1000 * 60,
  })
}
