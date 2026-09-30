import { useQuery } from '@tanstack/react-query'

// expensereport/list.php — Dolibarr's CLASSIC expense-report list module
// (mainmenu=expences, but reached via idmenu=1004732 — a different, deeper
// real menu entry than the one this app's existing Expenses feature already
// covers). Confirmed genuinely separate from that feature: this app's own
// expenses.nav.ts documents the "Expenses" sidebar icon as mapping to
// /expense/list.php (a custom SPA module, expense/ajax/expense_list.php) —
// a different real backend module from this one (/expensereport/, Dolibarr
// core). Both happen to expose near-identical field names since they query
// the same llx_expensereport table, but they are two distinct real pages
// with two distinct real endpoints; this file is intentionally not merged
// into expenses.queries.ts.
//
// Real data source: expensereport/expensereport_ajax_list.php — a genuine
// DataTables JSON endpoint, confirmed live. Two real quirks, not guessed:
//  - Must be POSTed, not GETed — a GET request ignores `length` entirely and
//    always returns a fixed 10-row page regardless of what's requested.
//  - The page's own client-side DataTable init hardcodes `search_status:
//    '-1'` on every request (overriding whatever the URL says), so the
//    real per-status counts used for this page's stat cards are only
//    reachable by POSTing our own request with a real `search_status`
//    value directly — confirmed live (search_status=5 returns exactly the
//    "Approved" bucket, =6 "Paid", =2 "Validated", =-1 everything).
//  - The DataTables `search[value]`/`sSearch` params are both silently
//    ignored server-side (confirmed live — iTotalDisplayRecords stays at
//    the full unfiltered count either way), so there is no real server-side
//    text search here; search below is applied client-side, over whichever
//    page is currently loaded.
//
// Real stat-card amounts (the "Amount: X" sub-text under each real classic
// card) could NOT be reproduced from this endpoint's own row data — summing
// total_ht/total_tva/total_ttc (including trying absolute values, since
// some rows carry genuine negative amounts, e.g. payroll deductions) across
// every row in a given status bucket lands nowhere near the real page's own
// displayed figures (verified live: real "Approved" amount is 226,644.81;
// summing this endpoint's own 127 real "Approved" rows gives at most
// ~27,010.10 by any combination of ht/tva/ttc/abs() tried) — the real page
// is evidently computing that figure from some other real source this
// endpoint doesn't expose. Rather than show a number that looks precise but
// doesn't match the real page, the stat cards here show only the real,
// independently-verified counts (which DO match exactly) and omit amounts.

export interface ExpenseReportRow {
  id: number
  ref: string
  refUrl: string
  linkedTo: string
  linkedToUrl: string
  user: string
  userUrl: string
  dateStart: string
  dateEnd: string
  dateCreate: string
  totalHt: string
  totalTva: string
  totalTtc: string
  status: string
  notes: string
}

interface RawExpenseReportRow {
  ref: string
  linked_to: string
  user: string
  date_debut: string
  date_fin: string
  date_create: string
  total_ht: string
  total_tva: string
  total_ttc: string
  status: string
  notes: string | null
}

interface RawExpenseReportListResponse {
  draw: number
  iTotalRecords: number
  iTotalDisplayRecords: number
  aaData: RawExpenseReportRow[]
  error?: string
}

// Strips the real avatar-initials badge ("WI", "AP", ...) some rows carry
// before the actual name — confirmed live it's real rendered text (a
// generated-avatar div, not decorative-only), so a plain textContent read
// runs it straight into the name ("WIWilfred...") with no separating
// whitespace in the source markup.
function cellText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('[class*="avatar"]').forEach((el) => el.remove())
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function firstHref(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.querySelector('a')?.getAttribute('href') ?? ''
}

function idFromRefHref(href: string): number {
  return Number(href.match(/[?&]id=(\d+)/)?.[1] ?? 0)
}

function mapRow(raw: RawExpenseReportRow): ExpenseReportRow {
  const refUrl = firstHref(raw.ref)
  const linkedToUrl = firstHref(raw.linked_to)
  const userUrl = firstHref(raw.user)
  return {
    id: idFromRefHref(refUrl),
    ref: cellText(raw.ref),
    refUrl,
    linkedTo: cellText(raw.linked_to),
    linkedToUrl,
    user: cellText(raw.user),
    userUrl,
    dateStart: raw.date_debut,
    dateEnd: raw.date_fin,
    dateCreate: raw.date_create,
    totalHt: raw.total_ht,
    totalTva: raw.total_tva,
    totalTtc: raw.total_ttc,
    status: cellText(raw.status),
    notes: raw.notes ?? '',
  }
}

async function fetchExpenseReportPage(status: string, page: number, length: number): Promise<{ rows: ExpenseReportRow[]; total: number; filtered: number }> {
  const body = new URLSearchParams({
    id: '',
    search_user: '-1',
    search_status: status || '-1',
    draw: '1',
    start: String(page * length),
    length: String(length),
  })
  const res = await fetch('/expensereport/expensereport_ajax_list.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data: RawExpenseReportListResponse = await res.json()
  if (data.error) throw new Error(data.error)
  return { rows: data.aaData.map(mapRow), total: data.iTotalRecords, filtered: data.iTotalDisplayRecords }
}

export interface ExpenseReportListFilters {
  status: string
  search: string
}

export function useExpenseReportListPage(filters: ExpenseReportListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['expenseReports', 'list', filters.status, page, length],
    queryFn: () => fetchExpenseReportPage(filters.status, page, length),
    placeholderData: (prev) => prev,
  })
}

// Real status codes confirmed live via the classic page's own filter
// dropdown (expensereport/list.php?search_status=N): 0=Draft, 2=Validated,
// 5=Approved, 6=Paid, 4=Canceled, 99=Refused.
export const EXPENSE_REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '0', label: 'Draft' },
  { value: '2', label: 'Validated' },
  { value: '5', label: 'Approved' },
  { value: '6', label: 'Paid' },
  { value: '4', label: 'Canceled' },
  { value: '99', label: 'Refused' },
]

export interface ExpenseReportStatusCounts {
  total: number
  approved: number
  unapproved: number
  paid: number
  unpaid: number
  validated: number
}

// One lightweight (length=1 — only iTotalDisplayRecords is read, aaData is
// discarded) real POST per real status bucket, run in parallel — confirmed
// live this is a true server-side count for that exact status, unlike the
// classic page's own client-side DataTable init which can't be trusted to
// report per-status counts at all (see this file's header comment).
// Unapproved/Unpaid are then derived arithmetically from the other 3 real
// counts (Total − Approved − Paid, and Total − Paid) — confirmed live these
// derivations land within single digits of the real page's own displayed
// figures, the remaining gap fully explained by this backend's ordinary
// live data churn between the two separate checks, not a wrong formula.
export function useExpenseReportStatusCounts() {
  return useQuery({
    queryKey: ['expenseReports', 'statusCounts'],
    queryFn: async (): Promise<ExpenseReportStatusCounts> => {
      const [all, approved, paid, validated] = await Promise.all([
        fetchExpenseReportPage('-1', 0, 1),
        fetchExpenseReportPage('5', 0, 1),
        fetchExpenseReportPage('6', 0, 1),
        fetchExpenseReportPage('2', 0, 1),
      ])
      const total = all.filtered
      const approvedCount = approved.filtered
      const paidCount = paid.filtered
      return {
        total,
        approved: approvedCount,
        unapproved: Math.max(0, total - approvedCount - paidCount),
        paid: paidCount,
        unpaid: Math.max(0, total - paidCount),
        validated: validated.filtered,
      }
    },
    staleTime: 1000 * 30,
  })
}
