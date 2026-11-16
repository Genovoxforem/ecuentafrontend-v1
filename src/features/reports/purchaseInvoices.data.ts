import { useQuery } from '@tanstack/react-query'
import type { ReportTable } from '../../shared/legacyReportTableParser'
import { fmt, fmtDate, num, usDate } from './reportFormat'

// "Purchase Invoices" of the Reports Center (classic compta/resultat/purchase_report.php). The classic page posts to the same file:
//   action=getReportData, date_range "MM/DD/YYYY-MM/DD/YYYY", type -1 All | 0 Purchases | 2 Returns, source "" All Sources | manual | automatic | asycuda
// -> { success, data { date_range { start, end, display }, summary { invoice_count, total_purchase, total_paid, total_unpaid, by_source { Manual, Automatic, Asycuda } },
//      income [invoice] } }
// An invoice carries rowid, ref, ref_supplier, type_label, datef, date_lim_reglement, socid, nom, code_fournisseur, mode_label, cond_label, source_label,
// total_ht, total_tva, amount, paidamount, multicurrency_code, author, status_label. Row fields and the filters were read on the 172.16.5.10 instance
// (43 invoices from 2026-10-01; type 2 = 1 return; source asycuda = 0) because newecuenta holds no purchase invoice; the summary keys are also seen on newecuenta.
// The classic page shows the summary as badges (Invoices, Purchase Total, Paid, Unpaid, Manual, Automatic, Asycuda), 18 columns and a totals row.
// The page's session cookie is needed (the file is not key-authenticated).

export type PurchaseTypeFilter = '-1' | '0' | '2'
export type PurchaseSourceFilter = '' | 'manual' | 'automatic' | 'asycuda'

export const PURCHASE_TYPE_OPTIONS: Array<{ value: PurchaseTypeFilter; label: string }> = [
  { value: '-1', label: 'All' },
  { value: '0', label: 'Purchases' },
  { value: '2', label: 'Returns' },
]
export const PURCHASE_SOURCE_OPTIONS: Array<{ value: PurchaseSourceFilter; label: string }> = [
  { value: '', label: 'All Sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'asycuda', label: 'Asycuda' },
]

export interface PurchaseInvoice {
  id: number
  ref: string
  refSupplier: string
  type: string
  date: string
  dueDate: string
  vendorId: number
  vendor: string
  vendorCode: string
  paymentMode: string
  paymentTerms: string
  source: string
  totalHt: number
  totalVat: number
  amount: number
  paid: number
  currency: string
  author: string
  status: string
}

export interface PurchaseSummary {
  invoiceCount: number
  totalPurchase: number
  totalPaid: number
  totalUnpaid: number
  manual: number
  automatic: number
  asycuda: number
}

export interface PurchaseReport {
  periodLabel: string
  summary: PurchaseSummary
  invoices: PurchaseInvoice[]
}

interface RawInvoice {
  rowid: string
  ref: string
  ref_supplier?: string | null
  type_label?: string | null
  datef?: string | null
  date_lim_reglement?: string | null
  socid: string
  nom?: string | null
  code_fournisseur?: string | null
  mode_label?: string | null
  cond_label?: string | null
  source_label?: string | null
  total_ht?: number | string
  total_tva?: number | string
  amount?: number | string
  paidamount?: number | string
  multicurrency_code?: string | null
  author?: string | null
  status_label?: string | null
}

interface RawAnswer {
  success: boolean
  message?: string
  data: {
    date_range?: { display?: string }
    summary?: { invoice_count?: number; total_purchase?: number; total_paid?: number; total_unpaid?: number; by_source?: { Manual?: number; Automatic?: number; Asycuda?: number } }
    income: RawInvoice[]
  }
}

export async function loadPurchaseReport(from: string, to: string, type: PurchaseTypeFilter, source: PurchaseSourceFilter): Promise<PurchaseReport> {
  const body = new URLSearchParams({ action: 'getReportData', date_range: `${usDate(from)}-${usDate(to)}`, type, source })
  const res = await fetch('/compta/resultat/purchase_report.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = (await res.json()) as RawAnswer
  if (!json.success) throw new Error(json.message || 'Report request failed.')
  const d = json.data
  const s = d.summary ?? {}
  return {
    periodLabel: d.date_range?.display ?? `${from} To ${to}`,
    summary: {
      invoiceCount: s.invoice_count ?? 0,
      totalPurchase: num(s.total_purchase),
      totalPaid: num(s.total_paid),
      totalUnpaid: num(s.total_unpaid),
      manual: s.by_source?.Manual ?? 0,
      automatic: s.by_source?.Automatic ?? 0,
      asycuda: s.by_source?.Asycuda ?? 0,
    },
    invoices: (d.income ?? []).map((r) => ({
      id: Number(r.rowid),
      ref: r.ref,
      refSupplier: r.ref_supplier ?? '',
      type: r.type_label ?? '',
      date: fmtDate(r.datef),
      dueDate: fmtDate(r.date_lim_reglement),
      vendorId: Number(r.socid),
      vendor: r.nom ?? '',
      vendorCode: r.code_fournisseur ?? '',
      paymentMode: r.mode_label ?? '',
      paymentTerms: r.cond_label ?? '',
      source: r.source_label || 'Manual',
      totalHt: num(r.total_ht),
      totalVat: num(r.total_tva),
      amount: num(r.amount),
      paid: num(r.paidamount),
      currency: r.multicurrency_code ?? '',
      author: r.author ?? '',
      status: r.status_label ?? '',
    })),
  }
}

export function usePurchaseReport(from: string, to: string, type: PurchaseTypeFilter, source: PurchaseSourceFilter) {
  return useQuery({
    queryKey: ['reports', 'purchaseInvoices', from, to, type, source],
    queryFn: () => loadPurchaseReport(from, to, type, source),
    enabled: Boolean(from && to),
    staleTime: 30_000,
  })
}

// The 18 columns of the classic table and its totals row (excl. tax, VAT, incl. tax, paid and balance of every row listed).
export function purchaseTable(rows: PurchaseInvoice[]): ReportTable {
  const body = rows.map((r) => [
    r.ref,
    r.refSupplier,
    r.type,
    r.date,
    r.dueDate,
    r.vendor,
    r.vendorCode,
    r.paymentMode,
    r.paymentTerms,
    r.source,
    fmt(r.totalHt),
    fmt(r.totalVat),
    fmt(r.amount),
    fmt(r.paid),
    fmt(r.amount - r.paid),
    r.currency,
    r.author,
    r.status,
  ])
  if (rows.length) {
    const sum = (f: (r: PurchaseInvoice) => number) => fmt(rows.reduce((a, r) => a + f(r), 0))
    body.push(['Total :', '', '', '', '', '', '', '', '', '', sum((r) => r.totalHt), sum((r) => r.totalVat), sum((r) => r.amount), sum((r) => r.paid), sum((r) => r.amount - r.paid), '', '', ''])
  }
  return {
    headers: ['Ref', 'Ref.Vendor', 'Type', 'Invoice Date', 'Due Date', 'Vendor', 'Vendor Code', 'Payment Mode', 'Payment Terms', 'Source', 'Amount Excl Tax', 'VAT', 'Amount Incl Tax', 'Paid', 'Balance', 'Currency', 'Author', 'Status'],
    rows: body,
  }
}
