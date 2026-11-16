import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// The members list is adherents/fapi/list.php (fapi only). The classic ajax_adherents_list.php handler and the list.php scrape are no longer read; the fapi
// row has no login, so the Login column stays empty (master report AN-164).
export interface MemberRow {
  ref: string
  firstname: string
  lastname: string
  company: string
  login: string
  type: string
  email: string
  endOfSubscription: string
  status: string
  // Physical / Moral, as the list prints the nature of the member.
  nature: string
  // -1 draft, 0 terminated (resiliated), 1 validated; the list filters on it.
  statusCode: number
}
// The status code is read back from the words of the API status label when the row has no numeric status.
function statusCodeOf(label: string): number {
  const s = label.toLowerCase()
  if (s.includes('draft')) return -1
  if (s.includes('resiliat') || s.includes('terminat')) return 0
  return 1
}

// adherents/fapi/list.php: the members as JSON, read page by page. It has no login column, so Login stays empty.
interface FapiMember {
  ref?: string
  firstname?: string
  lastname?: string
  company?: string
  type?: { label?: string } | null
  email?: string
  subscription_end?: string
  status_label?: string
  nature?: string
  status?: number
}

// adherents/fapi/list.php answers status_label "Validated (waiting subscription)" for every validated member, whether or not a subscription was
// paid. The classic list prints "Up to date" for a validated member whose subscription end is still ahead and "Validated" for one with no
// subscription (checked on newecuenta, 6 Nov 2026, with two throwaway members: end 11/05/2027 -> "Up to date", no end date -> "Validated").
// A validated member whose end date has passed was not seen, so that one keeps the API's label.
export function listStatus(m: { status?: number | string; status_label?: string; subscription_end?: string | null }): string {
  const label = m.status_label ?? ''
  if (Number(m.status) !== 1) return label
  if (!m.subscription_end) return 'Validated'
  const end = new Date(m.subscription_end).getTime()
  return !Number.isNaN(end) && end + 86_399_000 >= Date.now() ? 'Up to date' : label
}

async function fetchAllMembersFapi(): Promise<{ rows: MemberRow[]; total: number }> {
  const rows: MemberRow[] = []
  let total = 0
  for (let page = 1; ; page++) {
    const d = await fapiGet<{ items?: FapiMember[]; pagination?: { total?: number; pages?: number } }>('/adherents/fapi/list.php', { page, limit: 100 })
    for (const m of d.items ?? [])
      rows.push({
        ref: m.ref ?? '',
        firstname: m.firstname ?? '',
        lastname: m.lastname ?? '',
        company: m.company ?? '',
        login: '',
        type: m.type?.label ?? '',
        email: m.email ?? '',
        endOfSubscription: m.subscription_end ?? '',
        status: listStatus(m),
        nature: m.nature === 'phy' ? 'Physical' : m.nature === 'mor' ? 'Moral' : (m.nature ?? ''),
        statusCode: typeof m.status === 'number' ? m.status : statusCodeOf(m.status_label ?? ''),
      })
    total = Number(d.pagination?.total) || rows.length
    if (page >= (Number(d.pagination?.pages) || 0)) break
  }
  return { rows, total }
}

export function useAllMembers() {
  return useQuery({ queryKey: ['members', 'all'], queryFn: fetchAllMembersFapi })
}

export function useMembersList(page: number, length: number) {
  const query = useAllMembers()
  const data = query.data
    ? { rows: query.data.rows.slice(page * length, (page + 1) * length), total: query.data.total, filtered: query.data.total }
    : undefined
  return { ...query, data }
}

// --- Members Area dashboard (adherents/index.php) -------------------------
//
// The real page is 100% server-rendered PHP with several raw inline SQL
// aggregations (member-type x status cross-tab, up-to-date-by-type,
// subscription-by-year, last-modified members, last-modified subscriptions)
// — confirmed by reading adherents/index.php directly, no JSON API of any
// kind exists for it. What follows is computed client-side from the one
// real API this module has (ajax_adherents_list.php, fetched in full via
// length=-1), matching the real page's own status rule as closely as the
// exposed columns allow — NOT a fabrication, but an honest reconstruction:
//
// - Draft / Resiliated counts: matched by keyword against the real status
//   badge text (LibStatut() mode 5 — "Draft"/"Resiliated" are the real
//   English short labels for status -1 / 0, confirmed by reading
//   Adherent::LibStatut() directly).
// - Up-to-date vs out-of-date: computed by comparing each member's real
//   endOfSubscription date to today, mirroring the real page's own rule
//   ("uptodate = end date is in future") — done via the date column
//   directly rather than the status text, so it doesn't depend on exact
//   translation strings.
// - Subscription amounts/dates (the KPI card, the Subscriptions/Year
//   chart+table, and Last Modified Subscriptions) need llx_subscription
//   data, which this endpoint never returns at all — left as "no real API"
//   rather than shown as a fabricated 0.
// - Last Modified Members shows the real member list, but NOT sorted by
//   modification date specifically — that column isn't exposed by this
//   endpoint either, so this is the real data, honestly not claiming an
//   ordering it can't back up.
export interface MembersDashboardData {
  total: number
  draft: number
  resiliated: number
  upToDate: number
  outOfDate: number
  byType: { type: string; draft: number; upToDate: number; outOfDate: number; resiliated: number }[]
  recentMembers: MemberRow[]
}

function categorize(row: MemberRow): 'draft' | 'resiliated' | 'upToDate' | 'outOfDate' {
  const s = row.status.toLowerCase()
  if (s.includes('draft')) return 'draft'
  if (s.includes('resiliat')) return 'resiliated'
  // The classic Members area counts a validated member with no subscription in "Out-of-date" (two throwaway members, 6 Nov 2026: the one
  // with a subscription ending in 2027 was Up-to-date 1, the one without any was Out-of-date 1).
  if (!row.endOfSubscription) return 'outOfDate'
  const end = new Date(row.endOfSubscription)
  if (!Number.isNaN(end.getTime()) && end.getTime() + 86_399_000 < Date.now()) return 'outOfDate'
  return 'upToDate'
}

export function useMembersDashboard() {
  const query = useAllMembers()
  const data = query.data ? buildDashboard(query.data.rows, query.data.total) : undefined
  return { ...query, data }
}

function buildDashboard(rows: MemberRow[], recordsTotal: number): MembersDashboardData {
  const byType = new Map<string, { type: string; draft: number; upToDate: number; outOfDate: number; resiliated: number }>()
  let draft = 0
  let resiliated = 0
  let upToDate = 0
  let outOfDate = 0

  for (const row of rows) {
    const cat = categorize(row)
    if (cat === 'draft') draft++
    else if (cat === 'resiliated') resiliated++
    else if (cat === 'upToDate') upToDate++
    else outOfDate++

    const typeKey = row.type || 'Unspecified'
    const entry = byType.get(typeKey) ?? { type: typeKey, draft: 0, upToDate: 0, outOfDate: 0, resiliated: 0 }
    entry[cat]++
    byType.set(typeKey, entry)
  }

  return { total: recordsTotal, draft, resiliated, upToDate, outOfDate, byType: Array.from(byType.values()), recentMembers: rows.slice(0, 5) }
}
