/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages, pickNum, pickNumOrNull, pickStr, usDate } from '../../api/fapiRow'

// compta/facture/fapi/advances.php?socid= (15 Oct 2026): the advance payments of a customer (llx_paiement_advance, the
// same columns advancelist_ajax.php read) with totals of the amount, the amount used and the amount remaining over the
// whole filtered set - the two used / remaining figures the classic JSON never carried. The receipt PDF links of the
// classic list are not part of the endpoint (a backend request), so the rows carry no View / Download link.
export interface AdvanceListRow {
  ref: string
  date: string
  thirdPartyName: string
  paymentType: string
  totalAdvance: number
  usedAmount: number
  remainingAmount: number
  author: string
  authorId: number | null
  viewUrl: string | null
  downloadUrl: string | null
}

export interface AdvanceListResponse {
  rows: AdvanceListRow[]
  totalAdvanceAmount: number
  totalUsedAmount: number
  totalRemainingAmount: number
}

export function advanceRowFromApi(r: any): AdvanceListRow {
  return {
    ref: pickStr(r, 'ref', 'label'),
    date: usDate(r.date ?? r.datec ?? r.date_creation),
    thirdPartyName: pickStr(r, 'third_party_name', 'thirdparty.name', 'customer.name', 'company'),
    paymentType: pickStr(r, 'payment_mode', 'payment_mode_label', 'mode_label', 'payment_type'),
    totalAdvance: pickNum(r, 'amount', 'total'),
    usedAmount: pickNum(r, 'used_amount', 'used_amt'),
    remainingAmount: pickNum(r, 'remaining_amount', 'remaining_amt'),
    author: pickStr(r, 'author.name', 'author', 'author_name', 'user_name'),
    authorId: pickNumOrNull(r, 'author.id', 'author_id', 'fk_user'),
    viewUrl: null,
    downloadUrl: null,
  }
}

export function useCustomerAdvancePayments(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'advanceList', socid],
    queryFn: async (): Promise<AdvanceListResponse> => {
      let totals: any = {}
      const items = await fetchAllPages(async (page) => {
        const d = await fapiGet<any>('/compta/facture/fapi/advances.php', { socid, page, limit: 100, sort: 'date' })
        totals = d.totals ?? totals
        return d
      })
      const rows = items.map(advanceRowFromApi)
      return {
        rows,
        totalAdvanceAmount: Number(totals.amount) || rows.reduce((sum, r) => sum + r.totalAdvance, 0),
        totalUsedAmount: Number(totals.used_amount) || 0,
        totalRemainingAmount: Number(totals.remaining_amount) || 0,
      }
    },
    enabled: !!socid,
    staleTime: 1000 * 30,
  })
}
