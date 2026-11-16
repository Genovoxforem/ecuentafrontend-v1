import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { ReportTable } from '../../shared/legacyReportTableParser'
import { fmt, usDate } from './reportFormat'

// "Loans Reports" of the Reports Center (classic loan/listreport.php): a period, then Ref. | Label | Capital | Start date | End date | Status.
// Data: loan/fapi/list.php, answer {items [{id, ref, label, capital, nbterm, date_start, date_end, paid_capital, remaining, status, status_label}],
// total, page, limit, pages, totals, status_labels, filters}, with the filters date_from / date_to, search and paid. newecuenta holds no loan (the
// classic page prints an empty table for 1 Jan to 31 Dec 2026 as well), so the rows are read under the document's own item shape and have not
// been seen; which date date_from / date_to compare with (the start date is assumed by the classic period filter, not confirmed) is not verified.

export interface LoanItem {
  id: number
  ref: string
  label: string
  capital: number
  date_start: string | null
  date_end: string | null
  status_label: string
}

interface LoanAnswer {
  items: LoanItem[]
  pages?: number
  totals?: { capital: number; currency?: string }
}

export interface LoansReport {
  items: LoanItem[]
  currency: string
}

// Every page of the loans of the period (200 a page).
export async function loadLoansReport(from: string, to: string): Promise<LoansReport> {
  const read = (page: number) => fapiGet<LoanAnswer>('/loan/fapi/list.php', { date_from: from || undefined, date_to: to || undefined, sort: 'date', direction: 'ASC', page, limit: 200 })
  const first = await read(1)
  const items = [...first.items]
  const pages = Math.min(first.pages ?? 1, 50)
  for (let page = 2; page <= pages; page++) items.push(...(await read(page)).items)
  return { items, currency: first.totals?.currency ?? '' }
}

export function mapLoansReport(r: LoansReport): ReportTable {
  // One row per loan as the classic table has them; no total row is added (the classic page's own empty table does not show whether it has one).
  const rows = r.items.map((l) => [l.ref, l.label, fmt(l.capital), l.date_start ? usDate(l.date_start.slice(0, 10)) : '', l.date_end ? usDate(l.date_end.slice(0, 10)) : '', l.status_label])
  return { headers: ['Ref.', 'Label', 'Capital', 'Start Date', 'End Date', 'Status'], rows }
}

export function useLoansReport(from: string, to: string) {
  return useQuery({ queryKey: ['reports', 'loans', from, to], queryFn: () => loadLoansReport(from, to), staleTime: 60_000 })
}
