import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { ReportTable } from '../../shared/legacyReportTableParser'

// compta/resultat/fapi/aging.php (changelog d475282c, #387; key-authenticated JSON, read-only): the receivables aging.
//   ?type=summary  one row per customer with its open balance split into current / 1-30 / 31-60 / 61-90 / 90+ days
//   ?type=details  one row per open invoice {id, ref, ref_client, customer {id, name}, date, due_date (epoch seconds), total_ttc, paid, outstanding, days_overdue, bucket}
//   ?date=YYYY-MM-DD the day the ages are counted to (today when left out); ?page and ?limit (200 by default) page the rows.
// Outstanding = total_ttc - the payments received, aged from the due date. Read live on newecuenta on 10 Nov 2026 (10 open invoices of one customer, 164.80), next
// to the classic pages these two report entries replace (all GET):
//   Aging Summary (compta/resultat/aging_summary.php) is an invoice-by-invoice list (No | Customer Name | Transaction | Date | Age(Days) | Amount | Balance Due) = the API's
//     `details`; Aging Details (aging_details.php) is one row per customer with the buckets Current | 30 | 60 | 90 | 120+ days = the API's `summary`. The names are crossed.
//   The figures are NOT the same: the classic list has 58 rows (balance due 46,708.90: the 10 invoices of the API, 47 more validated invoices of the custom invoice types 8 to 12
//     and one credit note, CR-V-26-0001 -2.50), the classic bucket page says 166.80 (62.00 + 104.80) where the API says 164.80, the classic Due Customers list says 49 invoices /
//     46,775.00, and the classic ages are one day lower (53 d where the API says 54 days overdue). The API's own wording is used here (see the master report, AN-187).
// The ten rows, their dates, ages and amounts are equal to the classic rows that both lists have.

export type AgingBucketKey = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus'

export const AGING_BUCKETS: ReadonlyArray<{ key: AgingBucketKey; label: string }> = [
  { key: 'current', label: 'Current' },
  { key: 'd1_30', label: '1-30 days' },
  { key: 'd31_60', label: '31-60 days' },
  { key: 'd61_90', label: '61-90 days' },
  { key: 'd90_plus', label: 'Over 90 days' },
]

export type AgingTotals = Record<AgingBucketKey, number> & { total_outstanding: number; invoice_count: number }

export interface AgingSummaryRow extends Record<AgingBucketKey, number> {
  socid: number
  name: string
  total_outstanding: number
  invoice_count: number
}

// The payables twin (compta/resultat/fapi/vendor_aging.php, #388, "the mirror of the customer aging": same buckets, same answer shape) has no rows on newecuenta
// (0 unpaid vendor invoices), so the name of the third party of a detail row is read from `customer`, or from `vendor` / `supplier` if that is what it
// names it; this was not seen with data.
export interface AgingDetailRow {
  id: number
  ref: string
  ref_client?: string | null
  customer?: { id: number; name: string }
  vendor?: { id: number; name: string }
  supplier?: { id: number; name: string }
  date: number
  due_date: number
  total_ttc: number
  paid: number
  outstanding: number
  days_overdue: number
  bucket: AgingBucketKey
}

interface AgingAnswer<T> {
  as_of: string
  items: T[]
  totals: AgingTotals
  pagination?: { page?: number; pages?: number; total?: number }
}

export interface AgingReport<T> {
  asOf: string
  items: T[]
  totals: AgingTotals
}

// Amounts as the classic report prints them: two decimals, thousands separated.
const money = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// The API sends the date of an invoice as epoch seconds of midnight UTC; the classic pages print mm/dd/yyyy on newecuenta.
export function usDateFromEpoch(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const d = new Date(seconds * 1000)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
}

const BUCKET_LABEL = Object.fromEntries(AGING_BUCKETS.map((b) => [b.key, b.label])) as Record<AgingBucketKey, string>

export type AgingParty = 'Customer' | 'Vendor'

export function mapAgingByCustomer(report: AgingReport<AgingSummaryRow>, party: AgingParty = 'Customer'): ReportTable {
  const rows = report.items.map((c) => [c.name, String(c.invoice_count), ...AGING_BUCKETS.map((b) => money(c[b.key])), money(c.total_outstanding)])
  const t = report.totals
  if (report.items.length > 0) rows.push(['Total', String(t.invoice_count), ...AGING_BUCKETS.map((b) => money(t[b.key])), money(t.total_outstanding)])
  return { headers: [party, 'Open invoices', ...AGING_BUCKETS.map((b) => b.label), 'Total outstanding'], rows }
}

const partyName = (i: AgingDetailRow) => (i.customer ?? i.vendor ?? i.supplier)?.name ?? ''

export function mapAgingByInvoice(report: AgingReport<AgingDetailRow>, party: AgingParty = 'Customer'): ReportTable {
  const rows = report.items.map((i, n) => [
    String(n + 1),
    partyName(i),
    i.ref,
    usDateFromEpoch(i.date),
    usDateFromEpoch(i.due_date),
    String(i.days_overdue),
    BUCKET_LABEL[i.bucket] ?? i.bucket,
    money(i.total_ttc),
    money(i.paid),
    money(i.outstanding),
  ])
  if (report.items.length > 0) {
    const sum = (f: (i: AgingDetailRow) => number) => report.items.reduce((s, i) => s + f(i), 0)
    rows.push(['Total', '', '', '', '', '', '', money(sum((i) => i.total_ttc)), money(sum((i) => i.paid)), money(sum((i) => i.outstanding))])
  }
  return { headers: ['No', party, 'Invoice', 'Date', 'Due date', 'Days overdue', 'Aging', 'Amount', 'Paid', 'Balance due'], rows }
}

const AGING_URL = { Customer: '/compta/resultat/fapi/aging.php', Vendor: '/compta/resultat/fapi/vendor_aging.php' } as const

// Every page of the answer (200 rows each), the totals and the date come from the first one.
async function loadAging<T>(type: 'summary' | 'details', asOf: string, party: AgingParty): Promise<AgingReport<T>> {
  const read = (page: number) => fapiGet<AgingAnswer<T>>(AGING_URL[party], { type, date: asOf || undefined, page, limit: 200 })
  const first = await read(1)
  const items = [...first.items]
  const pages = Math.min(first.pagination?.pages ?? 1, 50)
  for (let page = 2; page <= pages; page++) items.push(...(await read(page)).items)
  return { asOf: first.as_of, items, totals: first.totals }
}

export function useAgingByCustomer(asOf: string, party: AgingParty = 'Customer') {
  return useQuery({ queryKey: ['reports', 'aging', party, 'summary', asOf], queryFn: () => loadAging<AgingSummaryRow>('summary', asOf, party), staleTime: 60_000 })
}

export function useAgingByInvoice(asOf: string, party: AgingParty = 'Customer') {
  return useQuery({ queryKey: ['reports', 'aging', party, 'details', asOf], queryFn: () => loadAging<AgingDetailRow>('details', asOf, party), staleTime: 60_000 })
}
