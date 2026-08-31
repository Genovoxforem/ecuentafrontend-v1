import { useQuery } from '@tanstack/react-query'

// contrat/api/get_lines.php — real, confirmed by reading that file directly:
// fetches the real Contrat + ContratLigne rows for one contract (session-
// cookie auth, gated on the real "contrat"->"lire" permission), not a
// scrape. This is the only real per-contract data source found on this
// backend — contrat/card.php, contact.php, note.php, follow_up.php,
// document.php and agenda.php are all classic full-page legacy HTML with
// no JSON API behind them (checked every one directly), so the rest of the
// Contract Detail page's tabs are design-only, matching the user's own
// call: "if don't have the real json api means only design it".
//
// The contract's own header fields (ref, ref_customer/vendor, third-party,
// sales reps, dates, services status counts) aren't duplicated here — they
// come straight out of useContractsSummary()'s already-parsed row list
// (contrat/list_ajax.php), matched by id, since that's already real data
// this app fetches for the Contracts list.

export interface ContractLineRow {
  rowid: number
  fk_product: number
  product_label: string
  description: string
  qty: number
  price_ht: number
  price_ttc: number
  tva_tx: string
  vat_src_code: string
  remise_percent: number
  remise_type: number
  statut: number
  date_start: string
  date_end: string
  date_start_real: string
  date_end_real: string
  comment: string
  category_label: string
}

interface ContractLinesResponse {
  success: boolean
  contract_id: number
  lines: ContractLineRow[]
  total_lines: number
}

export function useContractLines(id: string | undefined) {
  return useQuery({
    queryKey: ['contracts', 'detail', id, 'lines'],
    queryFn: async (): Promise<ContractLinesResponse> => {
      const res = await fetch(`/contrat/api/get_lines.php?id=${id}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return res.json()
    },
    enabled: !!id,
  })
}

export function contractLineStatusLabel(statut: number): string {
  if (statut === 4) return 'Running'
  if (statut === 5) return 'Closed'
  return 'Not Running'
}
