import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { parseAdvanceListRow, type AdvanceListRow, type RawAdvanceListRow } from './advanceListParser'

// compta/facture/advancelist_ajax.php — real DataTables server-side JSON
// endpoint behind the real advance_list.php page (read directly:
// `echo json_encode(['draw','iTotalRecords','iTotalDisplayRecords','aaData'])`).
// Same "length=-1 fetches everything" convention already used for
// Quotations' own list (see quotations.queries.ts).
//
// One real, confirmed gap: the page's own two top-right totals ("Total Used
// Advance"/"Total Remaining Advance") are computed by advance_list.php
// itself via a *separate* direct SQL query — never put into this JSON
// response at all (used_amt/remaining_amt are selected into $obj server-side
// but commented out of both the row-mapping and the JS column list in the
// real source). Only "Total Advance Amount" is honestly derivable here, by
// summing the real per-row totals this endpoint does return.
export interface AdvanceListResponse {
  rows: AdvanceListRow[]
  totalAdvanceAmount: number
}

export function useCustomerAdvancePayments(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'advanceList', socid],
    queryFn: async (): Promise<AdvanceListResponse> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '-1', socid: socid ?? '' })
      const { data } = await axios.post<{ aaData: RawAdvanceListRow[] }>(`/compta/facture/advancelist_ajax.php?socid=${socid}`, body)
      const rows = (data.aaData ?? []).map(parseAdvanceListRow)
      const totalAdvanceAmount = rows.reduce((sum, r) => sum + r.totalAdvance, 0)
      return { rows, totalAdvanceAmount }
    },
    enabled: !!socid,
    staleTime: 1000 * 30,
  })
}
