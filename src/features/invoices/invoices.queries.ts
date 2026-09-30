import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../api/axios'

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

// compta/facture/invoice_ajax_list.php — the classic Sales Invoices list's own
// DataTables source, and the one endpoint this list reads from. Confirmed live
// against 172.16.5.10 (492 rows in one POST with length=5000, the same count
// as the classic screen). It replaces GET /api/invoices/, which runs a query
// that selects newer columns (f.is_rebate, …) and fails outright on a database
// that doesn't have them, while this endpoint works everywhere the classic
// page does.
//
// Its column keys are misnamed but the cells are exactly the classic screen's:
//   cust_name  = ref link (…facid=<id>)         invoiceno = ZRA invoice no ("-" if none)
//   currency   = "<date><br><small>Due: …</small>"
//   typent_code= third-party link (…socid=<id>, avatar initials + name)
//   cust_type  = "<payment type><br><small>terms</small>"
//   tot_amount = "<div>total incl. tax</div><small>HT | VAT</small>"
//   author     = user link      status = badge      zrastatus = badge
// A row's status badge reads Draft / Not paid / Started (partly paid) / Paid /
// Abandoned; Not paid and Started are both "validated, still owing".
type RawAjaxInvoice = Record<string, unknown>

const parse = (html: unknown): Document => new DOMParser().parseFromString(String(html ?? ''), 'text/html')
const cellText = (html: unknown): string => parse(html).body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
const firstLine = (html: unknown): string => cellText(String(html ?? '').split(/<br\s*\/?>/i)[0])

// "09/24/2026" (the classic screen's format) -> "2026-09-24" so rows sort and
// compare as plain strings.
function toIsoDate(us: string): string {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : us
}

function statusOf(html: unknown): { status: string; rawStatut: number } {
  const label = cellText(html).toLowerCase()
  if (label.startsWith('draft')) return { status: 'Draft', rawStatut: 0 }
  if (label.startsWith('paid')) return { status: 'Paid', rawStatut: 2 }
  if (label.startsWith('abandon')) return { status: 'Abandoned', rawStatut: 3 }
  return { status: 'Unpaid', rawStatut: 1 }
}

export function parseInvoiceListRow(r: RawAjaxInvoice): InvoiceRow | null {
  const id = Number(r.id)
  if (!id) return null
  const thirdPartyDoc = parse(r.typent_code)
  const zraDoc = parse(r.zrastatus)
  const link = thirdPartyDoc.querySelector('a')
  const socid = Number(new URLSearchParams((link?.getAttribute('href') ?? '').split('?')[1] ?? '').get('socid'))
  const statusCell = String(r.status ?? '').split(/<br\s*\/?>/i)
  const { status, rawStatut } = statusOf(statusCell[0])
  const invoiceNo = cellText(r.invoiceno)
  const amountDoc = parse(r.tot_amount)
  const amountLine = amountDoc.querySelector('small')?.textContent ?? ''
  const authorDoc = parse(r.author)
  const authorLink = authorDoc.querySelector('a')
  const dateLine = String(r.currency ?? '').split(/<br\s*\/?>/i)
  const invoiceDateLabel = firstLine(r.currency)
  return {
    id,
    ref: cellText(r.cust_name),
    invoiceNo: invoiceNo === '-' ? '' : invoiceNo,
    invoiceDate: toIsoDate(invoiceDateLabel),
    invoiceDateLabel,
    dueDate: cellText(dateLine[1]).replace(/^Due:\s*/i, ''),
    // The link holds an initials badge plus the name — take the name node.
    thirdParty: (link?.lastChild?.textContent ?? cellText(r.typent_code)).trim(),
    socid: socid || null,
    thirdPartyColor: thirdPartyDoc.querySelector<HTMLElement>('.avatar-circle')?.style.backgroundColor ?? '',
    city: '',
    paymentType: firstLine(r.cust_type),
    amountInclTax: Number((amountDoc.querySelector('div')?.textContent ?? '').replace(/[^0-9.\-]/g, '')) || 0,
    amountHt: /HT:\s*([^|]*?)\s*(\||$)/.exec(amountLine)?.[1]?.trim() ?? '',
    vatAmount: /VAT:\s*(.*)$/.exec(amountLine)?.[1]?.trim() ?? '',
    author: cellText(r.author),
    authorId: Number(new URLSearchParams((authorLink?.getAttribute('href') ?? '').split('?')[1] ?? '').get('id')) || null,
    authorPhoto: authorDoc.querySelector('img')?.getAttribute('src') ?? '',
    status,
    statusLabel: cellText(statusCell[0]),
    currency: cellText(statusCell[1]).replace(/^Currency:\s*/i, ''),
    zraStatus: cellText(r.zrastatus),
    zraQrUrl: zraDoc.querySelector('a[title="View QR Code"]')?.getAttribute('href') ?? '',
    // Only invoices that still owe money can take a payment.
    canRecordPayment: status === 'Unpaid',
    rawStatut,
  }
}

// One POST fetches every row ("fetch once, page/filter client-side", same
// convention as ThirdPartyList.tsx). Client count is derived from the distinct
// third parties; Paid / Unpaid are the sums of the paid rows and the
// validated-but-owing rows — on 172.16.5.10 that gives 113,654.00 and 1,425.00,
// exactly the classic screen's own cards.
export async function fetchInvoicesSummary(): Promise<InvoicesSummary> {
  const body = new URLSearchParams({ draw: '1', start: '0', length: '5000', 'order[0][column]': '2', 'order[0][dir]': 'desc', 'columns[0][data]': 'ref' })
  const { data } = await axios.post<{ aaData?: RawAjaxInvoice[] }>('/compta/facture/invoice_ajax_list.php?socid=0&userid=0&search_status=', body)
  const rows = (data.aaData ?? [])
    .map(parseInvoiceListRow)
    .filter((r): r is InvoiceRow => r !== null)
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
