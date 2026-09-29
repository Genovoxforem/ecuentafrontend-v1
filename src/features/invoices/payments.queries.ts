import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parsePaymentsList, type PaymentRow } from './paymentsListParser'

export type { PaymentRow }

export interface PaymentsPeriod {
  from: string // yyyy-MM-dd
  to: string // yyyy-MM-dd
}

// "2026-09-24" -> "09/24/2026" (the classic page's own date format)
const us = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

// compta/paiement/list.php?newdatepicker=<from> - <to> — see
// paymentsListParser.ts. The backend returns the whole period in one response
// (no paging), so search / sort / paging stay client-side, like every other
// list in this app.
export function usePayments(period: PaymentsPeriod) {
  return useQuery({
    queryKey: ['payments', period.from, period.to],
    queryFn: async (): Promise<{ items: PaymentRow[]; total: number }> => {
      const range = `${us(period.from)} - ${us(period.to)}`
      const items = parsePaymentsList(await fetchLegacyDocument('/compta/paiement/list.php', new URLSearchParams({ newdatepicker: range })))
      return { items, total: items.length }
    },
    placeholderData: (prev) => prev,
  })
}
