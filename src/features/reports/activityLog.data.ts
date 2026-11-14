import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { ReportTable } from '../../shared/legacyReportTableParser'

// custom/reports/fapi/activity_log.php (API #391, key-authenticated, read-only, ADMIN ONLY), read live on newecuenta on 10 Nov 2026. It replaces the
// classic Activity Log (custom/reports/log_report.php) and its byte-identical twin Online Transaction Log (transaction_report.php): one row per
// login session of llx_active_log.
//   ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&user=ID&page&limit(<=200)   a text that is not a date answers 400
// -> { period, items [{ id, user {id, name}, login (epoch s), logout (epoch s | null), ip, browser (the geolocation text the classic page prints under
//      "Browser Address"), description ("chrome 156.0.0.0 :: login", lower case; the classic page capitalises it), created {employees, third_parties,
//      purchase_orders, purchase_invoices, contracts, sales_orders, sales_invoices, expense_reports} }], totals {sessions, ...same counts}, pagination }
// Nov 2026: 326 sessions through the API against 322 on the classic page when it was read a little earlier (each sign-in adds one).
// The classic columns Subject Type and Note are not in the answer and are not shown. The classic times are UTC, like the epoch seconds here.

export interface ActivityCreated {
  employees: number
  third_parties: number
  purchase_orders: number
  purchase_invoices: number
  contracts: number
  sales_orders: number
  sales_invoices: number
  expense_reports: number
}

export interface ActivitySession {
  id: number
  user: { id: number; name: string } | null
  login: number | null
  logout: number | null
  ip: string | null
  browser: string | null
  description: string | null
  created: ActivityCreated
}

export interface ActivityLog {
  items: ActivitySession[]
  totals: ActivityCreated & { sessions: number }
}

interface ActivityAnswer {
  items: ActivitySession[]
  totals: ActivityLog['totals']
  pagination?: { pages?: number }
}

// Every page of the sessions (200 each, capped at 25 pages) with the totals of the first one.
export async function loadActivityLog(from: string, to: string, user: string): Promise<ActivityLog> {
  const read = (page: number) => fapiGet<ActivityAnswer>('/custom/reports/fapi/activity_log.php', { date_from: from || undefined, date_to: to || undefined, user: user || undefined, page, limit: 200 })
  const first = await read(1)
  const pages = Math.min(first.pagination?.pages ?? 1, 25)
  // the other pages are read together: each one is a round trip of its own (about 0.6 s on newecuenta)
  const rest = await Promise.all(Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => read(i + 2)))
  return { items: [...first.items, ...rest.flatMap((r) => r.items)], totals: first.totals }
}

export function useActivityLog(from: string, to: string, user: string) {
  return useQuery({ queryKey: ['reports', 'activityLog', from, to, user], queryFn: () => loadActivityLog(from, to, user), staleTime: 60_000, retry: false })
}

const pad = (n: number) => String(n).padStart(2, '0')

// "2026-11-10 05:20:38" (UTC) for an epoch-second time; empty when there is none.
export function utcDateTime(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const d = new Date(seconds * 1000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

const CREATED_LABEL: Array<[keyof ActivityCreated, string]> = [
  ['employees', 'employees'],
  ['third_parties', 'third parties'],
  ['purchase_orders', 'purchase orders'],
  ['purchase_invoices', 'purchase invoices'],
  ['contracts', 'contracts'],
  ['sales_orders', 'sales orders'],
  ['sales_invoices', 'sales invoices'],
  ['expense_reports', 'expense reports'],
]

// "2 sales invoices, 1 contract" for what the user created during the session; empty when nothing was.
export function createdSummary(c: ActivityCreated): string {
  return CREATED_LABEL.filter(([k]) => (c[k] ?? 0) > 0)
    .map(([k, label]) => `${c[k]} ${c[k] === 1 ? label.replace(/s$/, '').replace('third partie', 'third party') : label}`)
    .join(', ')
}

export function activityTable(items: ActivitySession[]): ReportTable {
  return {
    headers: ['Date', 'User', 'Action', 'IP Address', 'Browser Address', 'Logout', 'Created In The Session'],
    rows: items.map((s) => [utcDateTime(s.login), s.user?.name ?? '', s.description ?? '', s.ip ?? '', s.browser ?? '', utcDateTime(s.logout), createdSummary(s.created)]),
  }
}

export function activityUsers(items: ActivitySession[]): Array<{ id: number; name: string }> {
  const seen = new Map<number, string>()
  for (const s of items) if (s.user) seen.set(s.user.id, s.user.name)
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}
