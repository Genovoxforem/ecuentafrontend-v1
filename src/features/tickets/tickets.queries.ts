import { useQuery } from '@tanstack/react-query'

// The 2 real JSON APIs wired here — confirmed by reading both files
// directly. ticket_list_ajax.php is a real DataTables handler
// (hasRight('ticket','read')), used for both "List" and "My Assigned
// Tickets" (same endpoint, mode=mine); its response also carries jobcards
// (linked fichinter refs) and date_close, both genuinely returned but
// unused until this pass. ticket_stats_ajax.php is a real, well-built
// dashboard-counts endpoint (same permission check) whose by_status[]
// entries carry real hex colors, and whose created_by_me_today/
// assigned_to_me_today fields (also previously unused) back the "Today: N"
// badges on the My Tickets/Assigned to Me cards. A third real endpoint,
// ticket-side-list-ajax.php, exists but is NOT used here — confirmed to
// have zero permission check and an unescaped SQL LIKE clause (a live
// SQL-injection surface), reported not fixed per frontend-only scope.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// The list endpoint's cell values are themselves pre-rendered Dolibarr
// getNomUrl() HTML fragments (confirmed by reading the raw JSON directly),
// not full pages — same category as stripTags() above, already used on
// this exact response. These extract the real linked id + secondary-name
// each fragment already carries, for real in-app links / two-line cells,
// rather than throwing that structure away.
function parseUserLink(html: string): { name: string; userId: string | null } {
  if (!html) return { name: '', userId: null }
  const hrefMatch = html.match(/href="\/userprofile\/index\.php\?id=(\d+)"/)
  const nameMatch = html.match(/<span class="nopadding usertext">([^<]*)<\/span>/)
  return { userId: hrefMatch ? hrefMatch[1] : null, name: (nameMatch ? nameMatch[1] : stripTags(html)).trim() }
}
function parseThirdPartyLink(html: string): { name: string; subtitle: string; socid: string | null } {
  if (!html) return { name: '', subtitle: '', socid: null }
  const hrefMatch = html.match(/socid=(\d+)/)
  const nameMatch = html.match(/<\/div>\s*([^<]+)<\/a>/)
  const subtitleMatch = html.match(/<small[^>]*>([^<]*)<\/small>/)
  return {
    socid: hrefMatch ? hrefMatch[1] : null,
    name: (nameMatch ? nameMatch[1] : stripTags(html)).trim(),
    subtitle: (subtitleMatch ? subtitleMatch[1] : '').trim(),
  }
}

export interface TicketRow {
  id: number
  trackId: string
  statusCode: number
  ref: string
  author: string
  authorUserId: string | null
  subject: string
  type: string
  thirdParty: string
  thirdPartySubtitle: string
  thirdPartySocid: string | null
  jobcards: string
  dateCreate: string
  dateClose: string
  assignedTo: string
  assignedToUserId: string | null
  status: string
}
interface RawTicketRow {
  rowid: number
  track_id: string
  fk_statut: number
  ticket_ref: string
  author: string
  subject: string
  type: string
  thirdparty: string
  jobcards: string
  datec: string
  date_close: string
  assigned_to: string
  status: string
}
interface RawTicketListResponse {
  draw: number
  iTotalRecords: number
  iTotalDisplayRecords: number
  aaData: RawTicketRow[]
  error?: string
}

function mapTicketRow(r: RawTicketRow): TicketRow {
  const author = parseUserLink(r.author)
  const thirdParty = parseThirdPartyLink(r.thirdparty)
  const assignedTo = parseUserLink(r.assigned_to)
  return {
    id: r.rowid,
    trackId: r.track_id,
    statusCode: r.fk_statut,
    ref: stripTags(r.ticket_ref),
    author: author.name,
    authorUserId: author.userId,
    subject: r.subject,
    type: r.type,
    thirdParty: thirdParty.name,
    thirdPartySubtitle: thirdParty.subtitle,
    thirdPartySocid: thirdParty.socid,
    jobcards: stripTags(r.jobcards),
    dateCreate: r.datec,
    dateClose: r.date_close,
    assignedTo: assignedTo.name,
    assignedToUserId: assignedTo.userId,
    status: stripTags(r.status),
  }
}

export interface TicketListFilters {
  status: string
  mine: boolean
  // ISO (yyyy-mm-dd) from <input type="date"> — converted below to the real
  // backend's own "MM/DD/YYYY - MM/DD/YYYY" datefilter format (confirmed by
  // reading ticket_list_ajax.php: it splits on " - " and re-parses each
  // side with strtotime, so this exact separator/format is required).
  dateFrom?: string
  dateTo?: string
  // Real params too (search_fk_user_assign / search_fk_user_create) —
  // confirmed in the same source read.
  assignedToUserId?: string
  createdByUserId?: string
  search?: string
}

function toMDY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export function useTicketsList(filters: TicketListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['tickets', 'list', filters, page, length],
    queryFn: async (): Promise<{ rows: TicketRow[]; total: number; filtered: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      if (filters.status) body.set('search_fk_status', filters.status)
      if (filters.mine) body.set('mode', 'mine')
      if (filters.dateFrom && filters.dateTo) body.set('datefilter', `${toMDY(filters.dateFrom)} - ${toMDY(filters.dateTo)}`)
      if (filters.assignedToUserId) body.set('search_fk_user_assign', filters.assignedToUserId)
      if (filters.createdByUserId) body.set('search_fk_user_create', filters.createdByUserId)
      if (filters.search) body.set('search[value]', filters.search)
      const res = await fetch('/ticket/ticket_list_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawTicketListResponse = await res.json()
      if (data.error) throw new Error(data.error)
      return {
        rows: data.aaData.map(mapTicketRow),
        total: data.iTotalRecords,
        filtered: data.iTotalDisplayRecords,
      }
    },
  })
}

// There is no per-id JSON fetch anywhere on this backend (confirmed by
// reading ticket/card.php directly — its own field values, beyond what
// ticket_list_ajax.php already returns, only ever get rendered as classic
// HTML) — so this reuses the same real list endpoint's own documented
// length=-1 "fetch everything, filter client-side" mode (already the
// established pattern for other lists in this app, e.g. Quotations) rather
// than scraping card.php's rendered page. This genuinely returns fewer
// fields than the classic page shows — see TicketDetail.tsx's own comment
// for exactly which fields that leaves honestly unavailable (severity,
// ticket group/category, progress %, tags, initial message, read-on date
// are all SELECTed by ticket_list_ajax.php's own SQL and even joined to
// their label tables, but never included in its JSON output — a backend
// gap, not something scraping the classic page could fix without violating
// the no-HTML-scraping rule).
export function useTicketDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'detail', id],
    queryFn: async (): Promise<TicketRow | null> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
      const res = await fetch('/ticket/ticket_list_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawTicketListResponse = await res.json()
      if (data.error) throw new Error(data.error)
      const row = data.aaData.find((r) => String(r.rowid) === id)
      return row ? mapTicketRow(row) : null
    },
    enabled: !!id,
  })
}

export interface TicketStatusCount {
  code: string
  label: string
  color: string
  icon: string
  count: number
}
export interface TicketStats {
  total: number
  today: number
  createdByMe: number
  createdByMeToday: number
  assignedToMe: number
  assignedToMeToday: number
  byStatus: TicketStatusCount[]
}
interface RawTicketStatsResponse {
  total: number
  today: number
  created_by_me: number
  created_by_me_today: number
  assigned_to_me: number
  assigned_to_me_today: number
  by_status: Array<{ code: string | number; label: string; color: string; icon: string; count: number }>
  error?: string
}
export function useTicketStats() {
  return useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: async (): Promise<TicketStats> => {
      const res = await fetch('/ticket/ticket_stats_ajax.php', { method: 'POST', credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawTicketStatsResponse = await res.json()
      if (data.error) throw new Error(data.error)
      return {
        total: data.total,
        today: data.today,
        createdByMe: data.created_by_me,
        createdByMeToday: data.created_by_me_today,
        assignedToMe: data.assigned_to_me,
        assignedToMeToday: data.assigned_to_me_today,
        byStatus: data.by_status.map((s) => ({ code: String(s.code), label: s.label, color: s.color, icon: s.icon, count: s.count })),
      }
    },
    staleTime: 1000 * 30,
  })
}
