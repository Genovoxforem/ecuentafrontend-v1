import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

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

type RawAdvanceRow = Record<string, unknown>

const parse = (html: unknown): Document => new DOMParser().parseFromString(String(html ?? ''), 'text/html')
const cellText = (html: unknown): string => parse(html).body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
const linkId = (doc: Document, key: string): number | null => {
  const v = Number(new URLSearchParams((doc.querySelector('a')?.getAttribute('href') ?? '').split('?')[1] ?? '').get(key))
  return Number.isFinite(v) && v > 0 ? v : null
}
const isoDate = (us: string) => {
  const m = us.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : us
}

// One DataTables row of compta/facture/advancelist_ajax.php (the classic
// "Customer Advance Payments" list's own source — its column keys are
// misnamed, see the PHP): cust_name = ref, currency = creation date
// (MM/dd/yyyy), contact = third-party link, cust_type = payment mode,
// tot_amount = advance amount, author = user link. (The "action" cell holds
// receipt PDF links, which are not shown here.)
export function parseAdvanceRow(r: RawAdvanceRow): AdvancePaymentRow {
  const party = parse(r.contact)
  const author = parse(r.author)
  return {
    ref: cellText(r.cust_name),
    date: isoDate(cellText(r.currency)),
    thirdParty: (party.querySelector('a')?.lastChild?.textContent ?? cellText(r.contact)).trim() || null,
    socid: linkId(party, 'socid'),
    amount: Number(cellText(r.tot_amount).replace(/[^0-9.\-]/g, '')) || 0,
    paymentTypeLabel: cellText(r.cust_type) || null,
    author: cellText(r.author) || null,
    authorId: linkId(author, 'id'),
  }
}

// POST compta/facture/advancelist_ajax.php — replaces GET
// /api/invoices/advance-payments/, which does not exist on the backend (404).
// One request returns every advance payment; search/sort/paging stay
// client-side like the other lists.
export function useAdvancePayments() {
  return useQuery({
    queryKey: ['invoices', 'advance-payments'],
    queryFn: async (): Promise<{ items: AdvancePaymentRow[]; total: number }> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '5000', 'search[value]': '' })
      const { data } = await axios.post<{ aaData?: RawAdvanceRow[] }>('/compta/facture/advancelist_ajax.php?socid=0&userid=0&search_status=', body)
      const items = (data.aaData ?? []).map(parseAdvanceRow)
      return { items, total: items.length }
    },
  })
}
