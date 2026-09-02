import { useQuery } from '@tanstack/react-query'

export interface PurchaseReportInvoiceRow {
  id: number
  ref: string
  vendor: string
  vendorSocid: number
  refSupplier: string
  invoiceDate: string
  amount: number
  paidAmount: number
}

export interface PurchaseReportData {
  invoices: PurchaseReportInvoiceRow[]
  totalIncome: number
  totalExpense: number
  netProfitLoss: number
  companyName: string
}

interface RawIncomeRow {
  rowid: string
  ref: string
  ref_supplier: string
  socid: string
  nom: string
  datec: string
  amount: number
  paidamount: number
}

interface RawReportResponse {
  success: boolean
  message?: string
  data: {
    income: RawIncomeRow[]
    total_expense: number
    total_profit: number
    pl_value: number
    company_info: { name?: string; address?: string }
  }
}

function toLegacyDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${m}/${d}/${y}`
}

export interface SalesInvoiceRow {
  id: number
  ref: string
  date: string
  customer: string
  paymentMode: string
  totalHt: number
  totalVat: number
  totalTtc: number
  paid: number
  remain: number
  author: string
  status: string
}

export interface SalesInvoicesReportData {
  invoices: SalesInvoiceRow[]
  total: number
  totals: { ht: string; vat: string; ttc: string; paid: string; remain: string }
}

interface RawSalesInvoicesResponse {
  recordsTotal: number
  recordsFiltered: number
  data: string[]
  totals: { ht: string; vat: string; ttc: string; paid: string; remain: string }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// Real via compta/facture/listreport_api.php — the real JSON DataTables
// endpoint behind compta/facture/listreport.php ("Sales Invoices", in the
// Reports Center's own real "Receivables" category — confirmed by reading
// the PHP source directly). Real permission check (hasRight('facture',
// 'lire')), real date-range/status/customer filters, real running totals.
// Each row is a positional array of pre-rendered HTML cells (checkbox,
// ref link, receipt no, date, customer, payment mode, HT, VAT, TTC, paid,
// remain, author, status badge) — stripped client-side like every other
// scraped-shape real endpoint in this app.
export function useSalesInvoicesReport(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['reports', 'salesInvoices', dateFrom, dateTo],
    queryFn: async (): Promise<SalesInvoicesReportData> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '500', s_date: dateFrom, e_date: dateTo })
      const res = await fetch('/compta/facture/listreport_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawSalesInvoicesResponse = await res.json()
      return {
        invoices: (json.data as unknown as string[][]).map((cells) => ({
          id: Number(stripTags(cells[1]).match(/\d+/)?.[0] ?? 0) || 0,
          ref: stripTags(cells[1]),
          date: cells[3],
          customer: stripTags(cells[4]),
          paymentMode: stripTags(cells[5]),
          totalHt: Number(stripTags(cells[6]).replace(/,/g, '')),
          totalVat: Number(stripTags(cells[7]).replace(/,/g, '')),
          totalTtc: Number(stripTags(cells[8]).replace(/,/g, '')),
          paid: Number(stripTags(cells[9]).replace(/,/g, '')),
          remain: Number(stripTags(cells[10]).replace(/,/g, '')),
          author: stripTags(cells[11]),
          status: stripTags(cells[12]),
        })),
        total: json.recordsFiltered,
        totals: json.totals,
      }
    },
    enabled: Boolean(dateFrom && dateTo),
  })
}

// Real via compta/resultat/purchase_report.php — the actual file the real
// llx_menu row (position 260, "Purchase report") points to, confirmed by
// reading the PHP source directly. Unlike almost every other file in this
// sprawling, duplicate-riddled compta/resultat/ directory (100+ files, many
// -old/-backup/-copy variants), this one is genuinely self-contained AJAX:
// a POST with action=getReportData returns real JSON, gated by the same
// restrictedArea() check that runs on every page load (not just the ajax
// branch) — a real permission check, unlike most *-sidebar-list-ajax.php
// files found elsewhere this session. date_range must be 'MM/DD/YYYY-MM/DD/YYYY'.
export function usePurchaseReport(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['reports', 'purchase', dateFrom, dateTo],
    queryFn: async (): Promise<PurchaseReportData> => {
      const body = new URLSearchParams({
        action: 'getReportData',
        date_range: `${toLegacyDate(dateFrom)}-${toLegacyDate(dateTo)}`,
        type: '-1',
      })
      const res = await fetch('/compta/resultat/purchase_report.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawReportResponse = await res.json()
      if (!json.success) throw new Error(json.message || 'Report request failed.')
      return {
        invoices: json.data.income.map((row) => ({
          id: Number(row.rowid),
          ref: row.ref,
          vendor: row.nom,
          vendorSocid: Number(row.socid),
          refSupplier: row.ref_supplier,
          invoiceDate: row.datec,
          amount: Number(row.amount),
          paidAmount: Number(row.paidamount),
        })),
        totalIncome: Number(json.data.total_profit),
        totalExpense: Number(json.data.total_expense),
        netProfitLoss: Number(json.data.pl_value),
        companyName: json.data.company_info.name ?? '',
      }
    },
    enabled: Boolean(dateFrom && dateTo),
  })
}
