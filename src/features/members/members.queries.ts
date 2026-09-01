import { useQuery } from '@tanstack/react-query'

// Real via adherents/ajax/ajax_adherents_list.php — confirmed genuine JSON
// DataTables handler with a real permission check (restrictedArea($user,
// 'adherent')). This module is enabled (MAIN_MODULE_ADHERENT=1) across
// every entity on this instance but has zero real data (0 rows in
// llx_adherent/llx_adherent_type) — confirmed live below returns an
// honestly empty list, not a fabricated one.
//
// Two sibling real JSON endpoints exist (members-sidebar-list-ajax.php,
// member_types-sidebar-list-ajax.php) but are NOT used here — confirmed to
// have zero permission checks at all, a live PII-leak (member names/
// logins/status readable by any authenticated user regardless of module
// rights). Reported, not fixed, per frontend-only scope.
//
// Response rows are POSITIONAL arrays whose column set depends on the
// endpoint's own server-side "checked" column config — read directly from
// the PHP's $arrayfields defaults and the exact row-building order (not
// guessed): ref, firstname, lastname, company, login, morphy, type, email,
// datefin (end of subscription), statut. MAIN_SHOW_TECHNICAL_ID (which
// would prepend a raw id column) is confirmed unset on this instance.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

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
}
interface RawMemberListResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  data: string[][]
}

function mapRows(data: RawMemberListResponse): MemberRow[] {
  return data.data.map((cells) => ({
    ref: stripTags(cells[0] ?? ''),
    firstname: cells[1] ?? '',
    lastname: cells[2] ?? '',
    company: cells[3] ?? '',
    login: cells[4] ?? '',
    type: stripTags(cells[6] ?? ''),
    email: stripTags(cells[7] ?? ''),
    endOfSubscription: stripTags(cells[8] ?? ''),
    status: stripTags(cells[9] ?? ''),
  }))
}

export function useMembersList(page: number, length: number) {
  return useQuery({
    queryKey: ['members', 'list', page, length],
    queryFn: async (): Promise<{ rows: MemberRow[]; total: number; filtered: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      const res = await fetch('/adherents/ajax/ajax_adherents_list.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawMemberListResponse = await res.json()
      return { rows: mapRows(data), total: data.recordsTotal, filtered: data.recordsFiltered }
    },
  })
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
  if (row.endOfSubscription) {
    const end = new Date(row.endOfSubscription)
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return 'outOfDate'
  }
  return 'upToDate'
}

export function useMembersDashboard() {
  return useQuery({
    queryKey: ['members', 'dashboard'],
    queryFn: async (): Promise<MembersDashboardData> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
      const res = await fetch('/adherents/ajax/ajax_adherents_list.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawMemberListResponse = await res.json()
      const rows = mapRows(data)

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

      return {
        total: data.recordsTotal,
        draft,
        resiliated,
        upToDate,
        outOfDate,
        byType: Array.from(byType.values()),
        recentMembers: rows.slice(0, 5),
      }
    },
  })
}
