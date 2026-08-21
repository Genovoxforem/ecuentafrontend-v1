import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface InvoiceRow {
  id: number
  ref: string
  invoiceNo: string
  invoiceDate: string
  thirdParty: string
  city: string
  paymentType: string
  amountInclTax: number
  author: string
  status: string
  zraStatus: string
  canRecordPayment: boolean
  // Raw Dolibarr fk_statut (0=draft,1=validated,2=paid,3=abandoned) — kept
  // alongside the friendly status_label above so pages that need the exact
  // code (Abandoned Invoices) don't have to reverse-engineer it from the
  // label.
  rawStatut: number
}

export interface InvoicesSummary {
  clients: number
  invoices: number
  paidAmount: number
  unpaidAmount: number
  rows: InvoiceRow[]
}

// GET /api/invoices/ (api/invoices/index.php on the real backend, read
// directly). Confirms the row shape exactly — notably: `date`, not `datef`;
// `thirdparty_name`; a ready-made `status_label` ('Draft'|'Unpaid'|'Paid')
// so there's no need to guess a status-code mapping; and a `zra_sdc` object
// (null unless a real ZRA e-invoicing upload happened) rather than a plain
// status string. City, payment type, and author aren't returned by this
// endpoint at all (Dolibarr invoices don't track an "author" field, and
// this query doesn't join for town/payment mode) — those stay blank rather
// than the wrong guesses this used to make up.
interface RawInvoice {
  id: number
  ref: string
  date: string
  thirdparty_name: string
  total_ttc: number
  status_label: 'Draft' | 'Unpaid' | 'Paid'
  statut: number
  zra_sdc: { upload_status?: string } | null
}

interface InvoicesResponse {
  success: boolean
  invoices: RawInvoice[]
  total_amount: number
  total_count: number
}

// Dolibarr facture status: 0=draft, 1=validated, 2=paid/closed. Both
// mark_paid.php and make_payment.php reject anything that isn't validated
// (STATUS_VALIDATED) and not already paid — confirmed by reading their
// source directly — so the UI only offers these actions when that's true,
// rather than letting the request round-trip just to fail.
export function toRow(raw: RawInvoice): InvoiceRow {
  return {
    id: raw.id,
    ref: raw.ref ?? '',
    invoiceNo: raw.ref ?? '',
    invoiceDate: raw.date ?? '',
    thirdParty: raw.thirdparty_name ?? '',
    // Not returned by this endpoint — see comment above.
    city: '',
    paymentType: '',
    author: '',
    amountInclTax: Number(raw.total_ttc ?? 0),
    // The backend's own status_label never accounts for fk_statut=3
    // (abandoned) and would mislabel it "Draft" — corrected here rather
    // than reproducing that gap.
    status: raw.statut === 3 ? 'Abandoned' : (raw.status_label ?? ''),
    zraStatus: raw.zra_sdc?.upload_status ?? '',
    canRecordPayment: raw.statut === 1,
    rawStatut: raw.statut,
  }
}

// GET /api/invoices/ — confirmed live. Client count isn't in this response,
// so it's derived from the distinct third parties on the returned rows
// rather than a separate customer-count call.
//
// limit: 500 — this endpoint defaults to just 50 rows (its own
// unenforced-max `limit` param) when none is passed, ordered newest-first.
// Without an explicit limit, older rows (draft/abandoned invoices with low
// row ids, for instance) silently fall off the fetched set even though
// total_count still reports the true total — confirmed live: the one real
// abandoned invoice in this database never appeared until this was added.
// Same "fetch up to 500 once, page/filter client-side" convention as
// ThirdPartyList.tsx.
export function useInvoicesSummary() {
  return useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: async (): Promise<InvoicesSummary> => {
      const { data } = await api.get<InvoicesResponse>('/invoices/', { params: { status: 'all', limit: 500 } })
      const rows = (data.invoices ?? []).map(toRow)
      const paidAmount = rows.filter((r) => r.status === 'Paid').reduce((sum, r) => sum + r.amountInclTax, 0)
      return {
        clients: new Set(rows.map((r) => r.thirdParty).filter(Boolean)).size,
        invoices: data.total_count ?? rows.length,
        paidAmount,
        unpaidAmount: Number(data.total_amount ?? 0) - paidAmount,
        rows,
      }
    },
    staleTime: 1000 * 60,
  })
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
