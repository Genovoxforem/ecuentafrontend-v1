/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages, isoDate, pickNum, pickNumOrNull, pickStr } from '../../api/fapiRow'

export interface AdvancePaymentRow {
  // The ref link on the classic list is "#" (no id), so rows are keyed by ref.
  ref: string
  date: string // yyyy-MM-dd
  thirdParty: string | null
  socid: number | null
  amount: number
  paymentTypeLabel: string | null
  author: string | null
  authorId: number | null
}

// compta/facture/fapi/advances.php (15 Oct 2026): every advance payment (llx_paiement_advance: amount / used_amt /
// remaining_amt, the columns the classic list read), searchable and paged by the server. Rows are read by their likely
// field names because the reference only shows an empty answer.
export function advanceFromApi(r: any): AdvancePaymentRow {
  return {
    ref: pickStr(r, 'ref', 'label'),
    date: isoDate(r.date ?? r.datec ?? r.date_creation),
    thirdParty: pickStr(r, 'third_party_name', 'thirdparty.name', 'customer.name', 'company') || null,
    socid: pickNumOrNull(r, 'socid', 'fk_soc', 'customer.id'),
    amount: pickNum(r, 'amount'),
    paymentTypeLabel: pickStr(r, 'payment_mode', 'payment_mode_label', 'payment_type', 'mode_label') || null,
    author: pickStr(r, 'author.name', 'author', 'author_name', 'user_name') || null,
    authorId: pickNumOrNull(r, 'author.id', 'author_id', 'fk_user'),
  }
}

export function useAdvancePayments() {
  return useQuery({
    queryKey: ['invoices', 'advance-payments'],
    queryFn: async (): Promise<{ items: AdvancePaymentRow[]; total: number }> => {
      const items = (await fetchAllPages((page) => fapiGet<any>('/compta/facture/fapi/advances.php', { page, limit: 100, sort: 'date' }))).map(advanceFromApi)
      return { items, total: items.length }
    },
  })
}
