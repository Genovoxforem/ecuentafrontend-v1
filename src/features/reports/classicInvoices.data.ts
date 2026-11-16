import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { ReportTable } from '../../shared/legacyReportTableParser'
import { fmt, usDate } from './reportFormat'

// The invoice list behind the classic Sales Invoices page (compta/facture/listreport.php) and the classic Till Report
// (compta/facture/tillreport.php, the same list filtered by till and employee). The classic page posts its own search form to
// compta/facture/listreport_ajax.php (read on newecuenta on 10 Nov 2026, period 2026-01-01..2026-12-31 = 91 invoices):
//   newdatepicker "MM/DD/YYYY-MM/DD/YYYY", customerid -1, type_sel ""|0 Sales|2 Returns, search_status ""|1 Due|4 Partially Paid|2 Paid|3 Canceled,
//   zra_status, search_currency_filter, userid (the author), draw, start, length
// -> { recordsFiltered, data [row object], totals { val { 'f.total_ht', 'f.total_vat', 'f.total_ttc', rtp (pending), totalam (received) } },
//      payment_summary [{ payment_mode, invoice_count, total_amount }] }
// A row has ref_clean, ref_client, zra_receipt_no, date, societe, type, payment_mode, payment_terms, total_ht / total_vat / total_ttc / remaintopay /
// totalpay (text with thousands separators), author_clean, status_label and pos_source (the till number of a POS invoice, null otherwise).
// The classic Till Report with "Terminal 1" lists exactly the rows whose pos_source is 1 (19 invoices, 1,559.15); "All Tills" lists every invoice (91, 49,641.79).
// The page's session cookie is needed (the endpoint is not key-authenticated).

export type InvoiceTypeFilter = '' | '0' | '2'
export type InvoiceStatusFilter = '' | '1' | '4' | '2' | '3'

export const INVOICE_TYPE_OPTIONS: Array<{ value: InvoiceTypeFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: '0', label: 'Sales' },
  { value: '2', label: 'Returns' },
]
export const INVOICE_STATUS_OPTIONS: Array<{ value: InvoiceStatusFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: '1', label: 'Due' },
  { value: '4', label: 'Partially Paid' },
  { value: '2', label: 'Paid' },
  { value: '3', label: 'Canceled' },
]

// ZRA Status of the classic Sales Invoices form: All, Succeed, Failed.
export const ZRA_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: '1', label: 'Succeed' },
  { value: '2', label: 'Failed' },
]

export interface ClassicInvoiceFilters {
  from: string
  to: string
  type: InvoiceTypeFilter
  status: InvoiceStatusFilter
  userId: string
  // the Customer select ('' or '-1' = every customer), ZRA Status and Filter by Currency of the classic Sales Invoices form
  customerId?: string
  zraStatus?: string
  currency?: string
}

// The figures the classic page prints in its four summary cards and its payment summary (from the same answer, see updateSummaryCards in the page).
export interface InvoiceSummary {
  // counts and amounts by invoice kind (Total Invoices and Total Amount cards)
  invoiceCount: number
  salesCount: number
  creditNoteCount: number
  salesAmount: number
  creditNoteAmount: number
  // Amount (Incl. Tax) card, Received / Pending card
  ttc: number
  vat: number
  ht: number
  received: number
  pending: number
  overpaid: number
  // the currency the figures are in (the filter, ZMW when none)
  currency: string
}

export interface PaymentSummaryItem {
  mode: string
  invoiceCount: number
  amount: number
}

export interface ClassicInvoice {
  id: number
  ref: string
  refClient: string
  receiptNo: string
  date: string
  thirdParty: string
  type: string
  paymentMode: string
  paymentTerms: string
  totalHt: number
  totalVat: number
  totalTtc: number
  pending: number
  received: number
  author: string
  status: string
  posSource: string | null
}

export interface ClassicInvoicesAnswer {
  invoices: ClassicInvoice[]
  total: number
  totals: { ht: number; vat: number; ttc: number; received: number; pending: number }
  summary: InvoiceSummary
  payments: PaymentSummaryItem[]
  // the currencies present in the period (the Filter by Currency select)
  currencies: string[]
}

interface RawInvoice {
  id: string | number
  ref_clean?: string
  ref?: string
  ref_client?: string | null
  zra_receipt_no?: string | number | null
  date?: string
  societe?: string
  type?: string | null
  payment_mode?: string | null
  payment_terms?: string | null
  total_ht?: string | number
  total_vat?: string | number
  total_ttc?: string | number
  remaintopay?: string | number
  totalpay?: string | number
  author_clean?: string | null
  author?: string | null
  status_label?: string
  pos_source?: string | number | null
}

interface RawAnswer {
  recordsFiltered: number
  data: RawInvoice[]
  totals?: { val?: Record<string, number | string> }
  invoice_counts?: Record<string, number | string>
  sales_totals?: Record<string, number | string> | null
  payment_summary?: Array<{ payment_mode?: string | null; invoice_count?: number | string; total_amount?: number | string }>
  currencies?: string[]
}

// "1,234.50" -> 1234.5 (the classic rows carry formatted text).
function amount(v: string | number | null | undefined): number {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function stripTags(s: string | null | undefined): string {
  return String(s ?? '').replace(/<[^>]+>/g, '').trim()
}

// The cards of the classic page (updateSummaryCards): with no currency filter the figures come from `sales_totals` (the same as the monthly statement), else
// from the multicurrency sums of `totals.val` and `invoice_counts`.
export function invoiceSummary(a: Pick<RawAnswer, 'totals' | 'invoice_counts' | 'sales_totals'>, currency: string): InvoiceSummary {
  const v = a.totals?.val ?? {}
  const c = a.invoice_counts ?? {}
  const s = a.sales_totals
  const multi = currency !== ''
  if (s && !multi) {
    return {
      invoiceCount: Number(s.total_n) || 0,
      salesCount: Number(s.sales_n) || 0,
      creditNoteCount: Number(s.cn_n) || 0,
      salesAmount: amount(s.sales_ttc),
      creditNoteAmount: amount(s.cn_ttc),
      ttc: amount(s.total_ttc),
      vat: amount(s.total_tva),
      ht: amount(s.total_ht),
      received: amount(s.received_net),
      pending: amount(s.pending),
      overpaid: amount(s.overpaid),
      currency: 'ZMW',
    }
  }
  return {
    invoiceCount: Number(c.total) || 0,
    salesCount: Number(c.sales) || 0,
    creditNoteCount: Number(c.credit_note) || 0,
    salesAmount: amount(multi ? c.sales_multicurrency_amount : c.sales_amount),
    creditNoteAmount: amount(multi ? c.credit_note_multicurrency_amount : c.credit_note_amount),
    ttc: amount(multi ? v['f.multicurrency_total_ttc'] : v['f.total_ttc']),
    vat: amount(multi ? v['f.multicurrency_total_vat'] : v['f.total_vat']),
    ht: amount(multi ? v['f.multicurrency_total_ht'] : v['f.total_ht']),
    received: amount(multi ? v['multicurrency_totalpay'] : v['totalam']),
    pending: amount(multi ? v['multicurrency_remaintopay'] : v['rtp']),
    overpaid: 0,
    currency: multi ? currency : 'ZMW',
  }
}

const CHUNK = 500
const MAX_CHUNKS = 20

export async function loadClassicInvoices(f: ClassicInvoiceFilters): Promise<ClassicInvoicesAnswer> {
  const read = async (start: number): Promise<RawAnswer> => {
    const body = new URLSearchParams({
      newdatepicker: `${usDate(f.from)}-${usDate(f.to)}`,
      customerid: f.customerId || '-1',
      type_sel: f.type,
      search_status: f.status,
      zra_status: f.zraStatus ?? '',
      search_currency_filter: f.currency ?? '',
      userid: f.userId,
      draw: '1',
      start: String(start),
      length: String(CHUNK),
    })
    const res = await fetch('/compta/facture/listreport_ajax.php', { method: 'POST', credentials: 'same-origin', body })
    if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    return (await res.json()) as RawAnswer
  }
  const first = await read(0)
  const raw = [...(first.data ?? [])]
  const total = first.recordsFiltered ?? raw.length
  for (let i = 1; i < MAX_CHUNKS && raw.length < total; i++) raw.push(...((await read(i * CHUNK)).data ?? []))
  const v = first.totals?.val ?? {}
  const totals = { ht: amount(v['f.total_ht']), vat: amount(v['f.total_vat']), ttc: amount(v['f.total_ttc']), received: amount(v['totalam']), pending: amount(v['rtp']) }
  return {
    total,
    totals,
    summary: invoiceSummary(first, f.currency ?? ''),
    payments: (first.payment_summary ?? []).map((p) => ({ mode: p.payment_mode || 'Not Specified', invoiceCount: Number(p.invoice_count) || 0, amount: amount(p.total_amount) })),
    currencies: first.currencies ?? [],
    invoices: raw.map((r) => ({
      id: Number(r.id) || 0,
      ref: r.ref_clean || stripTags(r.ref),
      refClient: r.ref_client ?? '',
      receiptNo: r.zra_receipt_no == null ? '' : String(r.zra_receipt_no),
      date: r.date ?? '',
      thirdParty: r.societe ?? '',
      type: r.type ?? '',
      paymentMode: r.payment_mode || 'Not Specified',
      paymentTerms: r.payment_terms ?? '',
      totalHt: amount(r.total_ht),
      totalVat: amount(r.total_vat),
      totalTtc: amount(r.total_ttc),
      pending: amount(r.remaintopay),
      received: amount(r.totalpay),
      author: r.author_clean || stripTags(r.author),
      status: r.status_label ?? '',
      posSource: r.pos_source == null ? null : String(r.pos_source),
    })),
  }
}

export function useClassicInvoices(f: ClassicInvoiceFilters) {
  return useQuery({
    queryKey: ['reports', 'classicInvoices', f],
    queryFn: () => loadClassicInvoices(f),
    enabled: Boolean(f.from && f.to),
    staleTime: 30_000,
  })
}

// The table of the two pages, with the columns and the two-line cells of the classic list: Ref. with the customer reference under it, Third-party with
// the invoice type, Payment Type with the terms, Amount (excl. tax) with the VAT. The Till Report also has Ref. customer and Vat as columns of their own.
export function invoicesTable(rows: ClassicInvoice[], variant: 'sales' | 'till'): ReportTable {
  if (variant === 'till') {
    return {
      headers: ['Ref.', 'Receipt No', 'Ref. customer', 'Invoice date', 'Third-party', 'Payment Type', 'Amount (excl. tax)', 'Vat', 'Amount (inc. tax)', 'Pending', 'Received', 'Author', 'Status'],
      rows: rows.map((r) => [
        r.ref,
        r.receiptNo,
        r.refClient,
        r.date,
        r.type ? `${r.thirdParty}\n${r.type}` : r.thirdParty,
        r.paymentTerms ? `${r.paymentMode}\n${r.paymentTerms}` : r.paymentMode,
        fmt(r.totalHt),
        fmt(r.totalVat),
        fmt(r.totalTtc),
        fmt(r.pending),
        fmt(r.received),
        r.author,
        r.status,
      ]),
    }
  }
  return {
    headers: ['Ref.', 'Receipt No', 'Invoice date', 'Third-party', 'Payment Type', 'Amount (excl. tax)', 'Amount (inc. tax)', 'Pending', 'Received', 'Author', 'Status'],
    rows: rows.map((r) => [
      r.refClient ? `${r.ref}\nref: ${r.refClient}` : r.ref,
      r.receiptNo,
      r.date,
      r.type ? `${r.thirdParty}\n${r.type}` : r.thirdParty,
      r.paymentTerms ? `${r.paymentMode}\n${r.paymentTerms}` : r.paymentMode,
      `${fmt(r.totalHt)}\nVAT: ${fmt(r.totalVat)}`,
      fmt(r.totalTtc),
      fmt(r.pending),
      fmt(r.received),
      r.author,
      r.status,
    ]),
  }
}

// The Employee select of the classic Till Report: the users of the instance (the filter is the invoice author, `userid`).
export function useReportUsers() {
  return useQuery({
    queryKey: ['reports', 'users'],
    queryFn: async () => {
      const d = await fapiGet<{ items?: Array<{ id: number; name?: string; fullname?: string; login: string }> }>('/core/fapi/users.php', { limit: 500 })
      return (d.items ?? []).map((u) => ({ id: String(u.id), name: u.name || u.fullname || u.login }))
    },
    staleTime: 10 * 60_000,
  })
}
