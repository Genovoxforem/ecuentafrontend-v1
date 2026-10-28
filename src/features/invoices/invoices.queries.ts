import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { api } from '../../api/axios'
import { loadRemainingPages } from '../../api/paging'
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
// as HTML). Every field is mapped onto the row the screens render by
// invoiceListMapper.ts.
//
// Credit notes are a separate query (`type=2`): the default list leaves them
// out, while the classic list shows them with the other invoices.
// The first page carries the page count; the rest load a few at a time, in page order.
async function fetchEveryInvoice(params: InvoiceListParams, signal?: AbortSignal): Promise<FapiInvoiceRow[]> {
  const first = await fetchInvoices({ ...params, page: 1, limit: 1000 }, signal)
  if (first.items.length === 0) return first.items
  const rest = await loadRemainingPages(first.pagination.pages, async (page) => (await fetchInvoices({ ...params, page, limit: 1000 }, signal)).items)
  return first.items.concat(...rest)
}

// Payment-type names and user ids/photos are not in the invoice rows. A lookup
// that fails only blanks that column (payment type) or the author's link and
// photo — it never fails the list.
async function fetchListLookups(signal?: AbortSignal): Promise<InvoiceListLookups> {
  const [modes, users] = await Promise.allSettled([
    fapiGet<{ mode_options: Array<{ id: number; label: string }> }>('/compta/facture/fapi/form_settings.php', undefined, signal),
    fapiGet<{ items?: Array<{ id: number; login: string; photo?: string }> }>('/core/fapi/users.php', { limit: 500 }, signal),
  ])
  const paymentModes = new Map<number, string>()
  if (modes.status === 'fulfilled') for (const m of modes.value.mode_options) paymentModes.set(m.id, m.label)
  const userMap = new Map<string, { id: number; photo: string }>()
  if (users.status === 'fulfilled') for (const u of users.value.items ?? []) userMap.set(String(u.login).toLowerCase(), { id: u.id, photo: u.photo ?? '' })
  return { paymentModes, users: userMap }
}

// One request fetches every row ("fetch once, page/filter client-side", same
// convention as ThirdPartyList.tsx). Client count is derived from the distinct
// third parties; Paid / Unpaid are the sums of the paid rows and the
// validated-but-owing rows — the same figures as the classic screen's own cards.
export async function fetchInvoicesSummary(signal?: AbortSignal): Promise<InvoicesSummary> {
  const [invoices, creditNotes, lookups] = await Promise.all([fetchEveryInvoice({}, signal), fetchEveryInvoice({ type: 2 }, signal), fetchListLookups(signal)])
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
  return useQuery({ queryKey: ['invoices', 'summary'], queryFn: ({ signal }) => fetchInvoicesSummary(signal), staleTime: 1000 * 60 })
}

// POST /api/invoices/mark_paid.php. Marks a validated, unpaid invoice as
// fully paid by creating a payment for the full remaining balance.
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
