/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages, pickNum, pickStr, usDate } from '../../api/fapiRow'

// compta/facture/fapi/credit_notes.php (16 Oct 2026): the returns view - credit notes (invoice type 2, drafts to
// abandoned) with the positive credited amounts (credited_ht / credited_ttc; the stored ones are negative), a
// by_status count and the most-returned products. It replaces the retunorder/card.php?action=list scrape, whose
// "Order Status" column was a hardcoded "Refund" and whose Sl.No never incremented. Row fields are read
// defensively: newecuenta holds no credit notes yet.
export interface CreditNoteRow {
  ref: string
  invoiceId: number
  createdDate: string
  customerName: string
  creditedTtc: number
  statusLabel: string
}

export function useCreditNoteList() {
  return useQuery({
    queryKey: ['warehouses', 'creditNoteList'],
    queryFn: async (): Promise<CreditNoteRow[]> => {
      const items = await fetchAllPages((page) => fapiGet<any>('/compta/facture/fapi/credit_notes.php', { page, limit: 100 }))
      return items.map(
        (c): CreditNoteRow => ({
          invoiceId: pickNum(c, 'id', 'invoice_id'),
          ref: pickStr(c, 'ref'),
          createdDate: usDate(c.date_creation ?? c.date ?? c.datef),
          customerName: pickStr(c, 'customer.name', 'thirdparty.name', 'third_party_name', 'company'),
          creditedTtc: pickNum(c, 'credited_ttc'),
          statusLabel: pickStr(c, 'status_label'),
        }),
      )
    },
    staleTime: 1000 * 30,
  })
}
