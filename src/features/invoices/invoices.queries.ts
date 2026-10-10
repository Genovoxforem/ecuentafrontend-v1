import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../api/axios'
import { fetchInvoices, type InvoiceListParams, type InvoiceRow as FapiInvoiceRow } from '../../api/invoices'
import { fapiInvoiceToRow, type InvoiceListLookups } from './invoiceListMapper'

export interface InvoiceRow {
  id: number
  ref: string
  invoiceNo: string
  invoiceDate: string
  // The classic screen's own display strings for the date cell (MM/dd/yyyy) and
  // its "Due:" line — invoiceDate above stays ISO so rows sort/compare as text.
  invoiceDateLabel: string
  dueDate: string
  thirdParty: string
  socid: number | null
  // Avatar background colour the classic list gives this third party.
  thirdPartyColor: string
  city: string
  paymentType: string
  amountInclTax: number
  // The "HT: … | VAT: …" line under the total, as the classic screen prints it.
  amountHt: string
  vatAmount: string
  author: string
  authorId: number | null
  authorPhoto: string
  status: string
  // The status badge's own wording (Draft / Not paid / Started / Paid / …) and
  // the currency line printed under it; status above is the normalised value
  // the rest of the app branches on.
  statusLabel: string
  currency: string
  zraStatus: string
  // ZRA verification link behind the QR icon (only on uploaded invoices).
  zraQrUrl: string
  canRecordPayment: boolean
  // Dolibarr fk_statut (0=draft, 1=validated/unpaid, 2=paid, 3=abandoned),
  // derived from the row's status badge — kept alongside the friendly status
  // so pages that need the exact code (Abandoned Invoices) don't have to
  // reverse-engineer it from the label.
  rawStatut: number
}

export interface InvoicesSummary {
  clients: number
  invoices: number
  paidAmount: number
  unpaidAmount: number
  rows: InvoiceRow[]
}

// compta/facture/fapi/list.php — the JSON list of sales invoices (the classic
// screen's own source, compta/facture/invoice_ajax_list.php, returns every cell
// as HTML, 1.5 MB of it for ~300 invoices). Every field is mapped onto the row
// the screens render by invoiceListMapper.ts, which was checked against all 294
// invoices of 172.16.5.10.
//
// Credit notes are a separate query (`type=2`): the default list leaves them
// out, while the classic list shows them with the other invoices.
async function fetchEveryInvoice(params: InvoiceListParams): Promise<FapiInvoiceRow[]> {
  const items: FapiInvoiceRow[] = []
  for (let page = 1; ; page++) {
    const result = await fetchInvoices({ ...params, page, limit: 1000 })
    items.push(...result.items)
    if (result.items.length === 0 || page >= result.pagination.pages) return items
  }
}

// Payment-type names and user ids/photos are not in the invoice rows. A lookup
// that fails only blanks that column (payment type) or the author's link and
// photo — it never fails the list.
async function fetchListLookups(): Promise<InvoiceListLookups> {
  const [modes, users] = await Promise.allSettled([
    api.get<{ success: boolean; results: { id: string | number; text: string }[] }>('/payment_types.php'),
    axios.get<{ rows?: { id: number; login: string; photo: string }[] }>('/userprofile/api/users.php', { params: { action: 'list', mode: 'all', limit: 500 } }),
  ])
  const paymentModes = new Map<number, string>()
  if (modes.status === 'fulfilled' && modes.value.data.success) for (const m of modes.value.data.results) paymentModes.set(Number(m.id), m.text)
  const userMap = new Map<string, { id: number; photo: string }>()
  if (users.status === 'fulfilled' && Array.isArray(users.value.data.rows)) for (const u of users.value.data.rows) userMap.set(String(u.login).toLowerCase(), { id: u.id, photo: u.photo })
  return { paymentModes, users: userMap }
}

// One request fetches every row ("fetch once, page/filter client-side", same
// convention as ThirdPartyList.tsx). Client count is derived from the distinct
// third parties; Paid / Unpaid are the sums of the paid rows and the
// validated-but-owing rows — on 172.16.5.10 that gives 113,654.00 and 1,425.00,
// exactly the classic screen's own cards.
export async function fetchInvoicesSummary(): Promise<InvoicesSummary> {
  const [invoices, creditNotes, lookups] = await Promise.all([fetchEveryInvoice({}), fetchEveryInvoice({ type: 2 }), fetchListLookups()])
  const rows = [...invoices, ...creditNotes]
    .map((item) => fapiInvoiceToRow(item, lookups))
    .sort((a, b) => (a.invoiceDate === b.invoiceDate ? b.id - a.id : a.invoiceDate < b.invoiceDate ? 1 : -1))
  const sum = (status: string) => rows.filter((r) => r.status === status).reduce((total, r) => total + r.amountInclTax, 0)
  return {
    clients: new Set(rows.map((r) => r.socid ?? r.thirdParty).filter(Boolean)).size,
    invoices: rows.length,
    paidAmount: sum('Paid'),
    unpaidAmount: sum('Unpaid'),
    rows,
  }
}

export function useInvoicesSummary() {
  return useQuery({ queryKey: ['invoices', 'summary'], queryFn: fetchInvoicesSummary, staleTime: 1000 * 60 })
}

// POST /api/invoices/mark_paid.php — real, confirmed endpoint (read
// directly, and its "Invoice not found" response verified live with a
// bogus id, no side effects). Marks a validated, unpaid invoice as fully
// paid by creating a payment for the full remaining balance.
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const { data } = await api.post<{ success: boolean; error?: string }>('/invoices/mark_paid.php', { invoice_id: invoiceId })
      if (!data.success) throw new Error(data.error ?? 'Failed to mark invoice as paid')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] }),
  })
}

// POST /api/invoices/make_payment.php — real, confirmed endpoint (its own
// header comment documents the exact contract: invoice_id + amount
// required, payment_method_id/note/payment_date/account_id optional).
// Records a partial or full payment against a validated invoice.
export function useRecordInvoicePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { invoiceId: number; amount: number; note?: string }) => {
      const { data } = await api.post<{ success: boolean; error?: string }>('/invoices/make_payment.php', {
        invoice_id: input.invoiceId,
        amount: input.amount,
        note: input.note,
      })
      if (!data.success) throw new Error(data.error ?? 'Failed to record payment')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] }),
  })
}
