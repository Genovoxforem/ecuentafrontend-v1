import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { useBankAccountDictionary, usePaymentModeDictionary } from '../../api/lookups'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'

// The invoice card's action buttons on compta/facture/fapi (key-authenticated JSON; replaces compta/sales/api/{invoice,email,
// payment,receipt}.php, which need a PHP session cookie). Send WhatsApp is deliberately not implemented: WhatsAppSender is
// never loaded on this install.
const FAPI = '/compta/facture/fapi'

// "dd/mm/yyyy" (what the date pickers hold) -> "yyyy-mm-dd" for the API.
const isoFromDmy = (v: string) => {
  const [d, m, y] = v.split('/')
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : v
}

// --- Create Credit Note ----------------------------------------------------

export const CREDIT_NOTE_REASONS = [
  'Wrong product (s)',
  'Wrong price',
  'Damaged Goods',
  'Wrong Customer invoiced',
  'Duplicated invoice',
  'Excess supplies',
  'Other (Provide other reason in brief)',
]

export interface CreateCreditNoteInput {
  createtype: 'lines' | 'remaining'
  cnDate: string // dd/mm/yyyy
  notePublic: string
  notePrivate: string
}

export function useCreateCreditNote(facid: string | undefined) {
  return useMutation({
    mutationFn: async (input: CreateCreditNoteInput) => {
      const d = await fapiPost<{ id?: number }>(`${FAPI}/credit_notes.php`, {
        id: Number(facid),
        mode: input.createtype,
        date: isoFromDmy(input.cnDate),
        note_public: input.notePublic,
        note_private: input.notePrivate,
      }, { action: 'create' })
      return { redirect: d.id ? `/invoices/${d.id}` : undefined }
    },
  })
}

// --- Create Debit Note ------------------------------------------------------

export const DEBIT_NOTE_REASONS = [
  { code: '01', label: 'Wrong quantity invoiced' },
  { code: '02', label: 'Wrong invoice amount' },
  { code: '03', label: 'Omitted item' },
  { code: '04', label: 'Other' },
]

export interface CreateDebitNoteInput {
  dnDate: string // dd/mm/yyyy
  reasonCode: string
  notePublic: string
  notePrivate: string
}

export function useCreateDebitNote(facid: string | undefined) {
  return useMutation({
    mutationFn: async (input: CreateDebitNoteInput) => {
      const d = await fapiPost<{ id?: number }>(`${FAPI}/debit_notes.php`, {
        id: Number(facid),
        date: isoFromDmy(input.dnDate),
        reason_code: input.reasonCode,
        note_public: input.notePublic,
        note_private: input.notePrivate,
      }, { action: 'create' })
      return { redirect: d.id ? `/invoices/${d.id}` : undefined }
    },
  })
}

// --- Send Email --------------------------------------------------------------

export interface EmailTemplate {
  id: string
  label: string
  topic: string
  content: string
}

export interface EmailData {
  from_name: string
  from_mail: string
  trackid: string
  subject: string
  body: string
  bcc: string
  recipients: { label: string }[]
  customer_email: string
  customer_name: string
  templates: EmailTemplate[]
}

interface RawEmailDefaults {
  sender_options?: Array<{ value: string; label: string }>
  default_from_type?: string
  recipients?: Array<{ value?: string; label: string }>
  default_recipient?: string
  default_subject?: string
  default_message?: string
  templates?: Array<{ id?: string | number; label?: string; topic?: string; content?: string }>
}

// "Name <mail>" -> its two parts.
function splitSender(label: string): { name: string; mail: string } {
  const m = /^(.*?)\s*<([^>]*)>\s*$/.exec(label)
  return m ? { name: m[1], mail: m[2] } : { name: label, mail: '' }
}

export function useSalesInvoiceEmailData(facid: string | undefined, enabled: boolean) {
  return useQuery<EmailData>({
    queryKey: ['salesInvoice', facid, 'emailData'],
    queryFn: async () => {
      const d = await fapiGet<RawEmailDefaults>(`${FAPI}/email.php`, { id: facid, action: 'email_defaults' })
      const sender = (d.sender_options ?? []).find((o) => o.value === d.default_from_type) ?? d.sender_options?.[0]
      const from = splitSender(sender?.label ?? '')
      return {
        from_name: from.name,
        from_mail: from.mail,
        trackid: '',
        subject: d.default_subject ?? '',
        body: d.default_message ?? '',
        bcc: '',
        recipients: (d.recipients ?? []).map((r) => ({ label: r.label })),
        customer_email: d.default_recipient ?? '',
        customer_name: '',
        templates: (d.templates ?? []).map((tp) => ({ id: String(tp.id ?? ''), label: tp.label ?? '', topic: tp.topic ?? '', content: tp.content ?? '' })),
      }
    },
    enabled: enabled && !!facid,
  })
}

export interface SendEmailInput {
  sendto: string
  sendtocc: string
  sendtobcc: string
  subject: string
  message: string
  frommail: string
  fromname: string
  replytomail: string
  replytoname: string
  attachpdf: boolean
  deliveryreceipt: boolean
}

export function useSendSalesInvoiceEmail(facid: string | undefined) {
  return useMutation({
    mutationFn: async (input: SendEmailInput) =>
      fapiPost<{ message?: string }>(`${FAPI}/email.php`, {
        id: Number(facid),
        sendto: input.sendto,
        sendtocc: input.sendtocc,
        sendtobcc: input.sendtobcc,
        fromtype: 'user',
        subject: input.subject,
        message: input.message,
        attach_doc: input.attachpdf ? 1 : 0,
      }, { action: 'send_email' }),
  })
}

// --- Record Payment ----------------------------------------------------------

export function usePaymentTypeOptions(enabled: boolean) {
  return usePaymentModeDictionary(enabled)
}

export function useBankAccountOptions(enabled: boolean) {
  return useBankAccountDictionary(enabled)
}

// Scoped to a single invoice (the one being viewed) rather than the real
// page's full multi-invoice batch-payment UI — covers the common case of
// paying off the invoice a user is actually looking at.
export interface RecordPaymentInput {
  facid: string
  socid: string
  invoiceType: string
  amount: string
  datepaid: string // yyyy-mm-dd
  paiementcode: string
  accountid: string
  numPaiement: string
  comment: string
  closepaidinvoices: boolean
}

export function useRecordSalesPayment(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      // The form holds the payment mode by its code; the API wants its id (form_settings.php lists both).
      const settings = await fapiGet<{ mode_options: Array<{ id: number; code: string }> }>(`${FAPI}/form_settings.php`)
      const mode = settings.mode_options.find((m) => m.code === input.paiementcode)
      if (!mode) throw new Error('Choose a payment type.')
      return fapiPost<unknown>(`${FAPI}/payments.php`, {
        id: Number(input.facid),
        amount: Number(input.amount),
        date: input.datepaid,
        payment_mode_id: mode.id,
        fk_account: Number(input.accountid),
        num_payment: input.numPaiement,
        comment: input.comment,
        // payments.php names this close_paid (close_paid_invoices is ignored); a payment that settles the invoice closes it anyway.
        close_paid: input.closepaidinvoices,
      }, { action: 'add' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

// --- Delete a payment (the card's trash button on a payment row) -----------------------------------------
// The button shows when compta/facture/fapi/payments.php?id=N says can_delete (the user's right, like the classic CAN_EDIT).
// The check and the delete are the classic card's own calls (compta/sales/api/payment.php, see its
// confirmDeletePayment / executeDeletePayment): no fapi documents a payment delete.
export function useCanDeleteInvoicePayment(facid: string | undefined) {
  return useQuery({
    queryKey: ['salesInvoice', facid, 'paymentRights'],
    queryFn: async () => !!(await fapiGet<{ can_delete?: boolean }>(`${FAPI}/payments.php`, { id: facid })).can_delete,
    enabled: !!facid,
    staleTime: 1000 * 60,
  })
}

const CLASSIC_PAYMENT_API = '/compta/sales/api/payment.php'

async function postClassicPayment<T>(fields: Record<string, string>): Promise<T> {
  const body = new FormData()
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  const res = await fetch(CLASSIC_PAYMENT_API, { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return parseLegacyJson<T>(res)
}

export interface PaymentDeleteConditions {
  hasLedgerEntry: boolean
  ledgerEntryIds: string[]
  hasBankEntry: boolean
  bankLabel: string
  bankRef: string
  bankEntryIds: string[]
}

// What deleting the payment also removes (check_delete_conditions); a refusal comes back as { success: false, message }.
export function usePaymentDeleteConditions(payid: string | null) {
  return useQuery({
    queryKey: ['salesInvoice', 'paymentDeleteConditions', payid],
    queryFn: async (): Promise<PaymentDeleteConditions> => {
      const d = await postClassicPayment<{ success?: boolean; message?: string; data?: Record<string, unknown> }>({ action: 'check_delete_conditions', payid: payid ?? '' })
      if (!d.success || !d.data) throw new Error(d.message || 'This payment cannot be deleted.')
      const x = d.data
      const ids = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
      return {
        hasLedgerEntry: !!x.has_ledger_entry,
        ledgerEntryIds: ids(x.ledger_entry_ids),
        hasBankEntry: !!x.has_bank_entry,
        bankLabel: String(x.bank_label ?? ''),
        bankRef: String(x.bank_ref ?? ''),
        bankEntryIds: ids(x.bank_entry_ids),
      }
    },
    enabled: !!payid,
    retry: false,
    staleTime: 0,
  })
}

export function useDeleteInvoicePayment(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: { payid: string; deleteBankEntry: boolean; deleteLedgerEntry: boolean }) => {
      const d = await postClassicPayment<{ success?: boolean; message?: string }>({
        action: 'delete_payment',
        payid: input.payid,
        delete_bank_entry: input.deleteBankEntry ? '1' : '0',
        delete_ledger_entry: input.deleteLedgerEntry ? '1' : '0',
      })
      if (!d.success) throw new Error(d.message || 'Failed to delete payment')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

// --- POS Ticket (read-only receipt view) -------------------------------------

export interface PosReceiptData {
  company: { logo?: string; name: string; address: string; country: string; phone: string; tpin: string }
  invoice: { ref: string; date: string; terminal?: string; token_no?: string; sales_associate?: string }
  customer: { name: string; tpin?: string }
  lines: { ref: string; label: string; qty: string; unit_price: string; total_ttc: string }[]
  totals: { qty: string; total_ht: string; total_tva: string; total_ttc: string; total_localtax1?: string; total_localtax2?: string; currency: string }
  vat_groups: Record<string, string>
  payments: { label: string; code: string; amount: string; currency: string; pos_change?: string }[]
  zra?: { receipt_no?: string; internal_data?: string; invoice_signature?: string; invoice_no?: string; sdc_id?: string; mrc?: string; date?: string; qr_base64?: string; qr_url?: string }
}

interface RawReceipt {
  company?: { logo_url?: string; name?: string; address?: string; country?: string; phone?: string; tpin?: string }
  invoice?: { ref?: string; date?: string; terminal?: string; token_no?: string; sales_associate?: { name?: string } | null }
  customer?: { name?: string; tpin?: string }
  lines?: Array<{ ref?: string; label?: string; qty?: number | string; unit_price?: number | string; total_ttc?: number | string }>
  totals?: { qty?: number | string; total_ht?: number | string; total_tva?: number | string; total_ttc?: number | string; total_localtax1?: number | string; total_localtax2?: number | string; currency?: string }
  vat_groups?: Record<string, number | string>
  payments?: Array<{ label?: string; code?: string; amount?: number | string; currency?: string; change?: number | string }>
  zra?: Record<string, string> | null
}

export function useSalesInvoicePosReceipt(facid: string | undefined, enabled: boolean) {
  return useQuery<PosReceiptData>({
    queryKey: ['salesInvoice', facid, 'posReceipt'],
    queryFn: async () => {
      const d = await fapiGet<RawReceipt>(`${FAPI}/receipt.php`, { id: facid })
      const str = (v: number | string | undefined) => String(v ?? '')
      const opt = (v: number | string | undefined) => (v === undefined ? undefined : String(v))
      return {
        company: { logo: d.company?.logo_url, name: d.company?.name ?? '', address: d.company?.address ?? '', country: d.company?.country ?? '', phone: d.company?.phone ?? '', tpin: d.company?.tpin ?? '' },
        invoice: { ref: d.invoice?.ref ?? '', date: d.invoice?.date ?? '', terminal: d.invoice?.terminal, token_no: d.invoice?.token_no, sales_associate: d.invoice?.sales_associate?.name },
        customer: { name: d.customer?.name ?? '', tpin: d.customer?.tpin },
        lines: (d.lines ?? []).map((l) => ({ ref: l.ref ?? '', label: l.label ?? '', qty: str(l.qty), unit_price: str(l.unit_price), total_ttc: str(l.total_ttc) })),
        totals: {
          qty: str(d.totals?.qty),
          total_ht: str(d.totals?.total_ht),
          total_tva: str(d.totals?.total_tva),
          total_ttc: str(d.totals?.total_ttc),
          total_localtax1: opt(d.totals?.total_localtax1),
          total_localtax2: opt(d.totals?.total_localtax2),
          currency: d.totals?.currency ?? '',
        },
        vat_groups: Object.fromEntries(Object.entries(d.vat_groups ?? {}).map(([k, v]) => [k, str(v)])),
        payments: (d.payments ?? []).map((p) => ({ label: p.label ?? '', code: p.code ?? '', amount: str(p.amount), currency: p.currency ?? '', pos_change: opt(p.change) })),
        zra: d.zra ?? undefined,
      }
    },
    enabled: enabled && !!facid,
  })
}
