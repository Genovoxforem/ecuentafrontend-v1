import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real contracts for the remaining deferred action buttons — read verbatim
// from compta/sales/js/invoice.js and the inline EmailModal script on the
// real page (see salesInvoice.queries.ts header comment for the parent
// investigation). Send WhatsApp is deliberately NOT implemented here:
// confirmed live that `WhatsAppSender` is never loaded on this install, so
// the real page's own "Send WhatsApp" button is non-functional (just shows
// an error toast) — nothing real to bind.
const SALES_BASE = '/compta/sales'
const INVOICE_API = `${SALES_BASE}/api/invoice.php`

async function postForm<T = { success: boolean; error?: string; [k: string]: unknown }>(url: string, fd: FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = (await res.json()) as T & { success: boolean; error?: string }
  if (!json.success) throw new Error(json.error || 'The legacy backend rejected this request.')
  return json
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
      const fd = new FormData()
      fd.set('action', 'createcreditnote')
      fd.set('facid', facid ?? '')
      fd.set('createtype', input.createtype)
      fd.set('cn_date', input.cnDate)
      fd.set('note_public', input.notePublic)
      fd.set('note_private', input.notePrivate)
      return postForm<{ success: boolean; error?: string; redirect?: string }>(INVOICE_API, fd)
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
      const fd = new FormData()
      fd.set('action', 'createdebitnote')
      fd.set('facid', facid ?? '')
      fd.set('dn_date', input.dnDate)
      fd.set('dbt_reason_code', input.reasonCode)
      fd.set('note_public', input.notePublic)
      fd.set('note_private', input.notePrivate)
      return postForm<{ success: boolean; error?: string; redirect?: string }>(INVOICE_API, fd)
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

export function useSalesInvoiceEmailData(facid: string | undefined, enabled: boolean) {
  return useQuery<EmailData>({
    queryKey: ['salesInvoice', facid, 'emailData'],
    queryFn: async () => {
      const res = await fetch(`${SALES_BASE}/api/email.php?action=get_email_data&facid=${facid}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load email data.')
      return json
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
    mutationFn: async (input: SendEmailInput) => {
      const fd = new FormData()
      fd.set('action', 'send_email')
      fd.set('facid', facid ?? '')
      fd.set('sendto', input.sendto)
      fd.set('sendtocc', input.sendtocc)
      fd.set('sendtobcc', input.sendtobcc)
      fd.set('subject', input.subject)
      fd.set('message', input.message)
      fd.set('frommail', input.frommail)
      fd.set('fromname', input.fromname)
      fd.set('replytomail', input.replytomail)
      fd.set('replytoname', input.replytoname)
      fd.set('attachpdf', input.attachpdf ? '1' : '0')
      fd.set('deliveryreceipt', input.deliveryreceipt ? '1' : '0')
      return postForm<{ success: boolean; message?: string }>(`${SALES_BASE}/api/email.php`, fd)
    },
  })
}

// --- Record Payment ----------------------------------------------------------

export interface PaymentOption {
  id: string
  text: string
}

export function usePaymentTypeOptions(enabled: boolean) {
  return useQuery<PaymentOption[]>({
    queryKey: ['paymentTypes'],
    queryFn: async () => {
      const res = await fetch('/api/payment_types.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load payment types.')
      return json.results ?? []
    },
    enabled,
  })
}

export function useBankAccountOptions(enabled: boolean) {
  return useQuery<PaymentOption[]>({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const res = await fetch('/api/bank_accounts.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load bank accounts.')
      return json.results ?? []
    },
    enabled,
  })
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
      const [y, m, d] = input.datepaid.split('-')
      const fd = new FormData()
      fd.set('action', 'create_payment')
      fd.set('socid', input.socid)
      fd.set('type', input.invoiceType)
      fd.set('current_facid', input.facid)
      fd.set(`amount_${input.facid}`, input.amount)
      fd.set(`remain_${input.facid}`, input.amount)
      fd.set('datepaid', input.datepaid)
      fd.set('reday', d)
      fd.set('remonth', m)
      fd.set('reyear', y)
      fd.set('paiementcode', input.paiementcode)
      fd.set('accountid', input.accountid)
      fd.set('num_paiement', input.numPaiement)
      fd.set('comment', input.comment)
      if (input.closepaidinvoices) fd.set('closepaidinvoices', 'on')
      return postForm<{ success: boolean; message?: string; data?: { warning?: string } }>(`${SALES_BASE}/api/payment.php`, fd)
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

export function useSalesInvoicePosReceipt(facid: string | undefined, enabled: boolean) {
  return useQuery<PosReceiptData>({
    queryKey: ['salesInvoice', facid, 'posReceipt'],
    queryFn: async () => {
      const res = await fetch(`${SALES_BASE}/api/receipt.php?facid=${facid}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load the receipt.')
      return json.receipt
    },
    enabled: enabled && !!facid,
  })
}
