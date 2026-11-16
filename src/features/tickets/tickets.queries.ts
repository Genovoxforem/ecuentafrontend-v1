import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { stripTags } from '../../utils/text'

// The classic list's status filter (search_fk_status): "openall" (unread to
// on hold — what the Ticket / List / My Tickets menu entries open), "-1" every
// ticket, "closeall" solved + deleted, or one fk_statut code.
export const TICKET_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'openall', label: '-- Open (All) --' },
  { value: '-1', label: 'All' },
  { value: '0', label: 'Unread' },
  { value: '1', label: 'Read' },
  { value: '2', label: 'Assigned' },
  { value: '3', label: 'In progress' },
  { value: '5', label: 'Waiting for reporter feedback' },
  { value: '7', label: 'On hold' },
  { value: 'closeall', label: '-- Closed (All) --' },
  { value: '8', label: 'Solved' },
  { value: '9', label: 'Deleted' },
]

// ticket/fapi/form_options.php (API #394, key-authenticated), read live on newecuenta on 10 Nov 2026: the dictionaries of the ticket forms and filters.
//   { types [{code, label}] (7), severities [{code, label}] (4), categories [{code, label}] (2, "Ticket group"), statuses [{id, code, label}] (8),
//     assignable_users [{id, login, name}] (5) }
export interface TicketFormOptions {
  types: Array<{ code: string; label: string }>
  severities: Array<{ code: string; label: string }>
  categories: Array<{ code: string; label: string }>
  statuses: Array<{ id: number; code: string; label: string }>
  assignable_users: Array<{ id: number; login: string; name: string }>
}

export function fetchTicketFormOptions(): Promise<TicketFormOptions> {
  return fapiGet<TicketFormOptions>('/ticket/fapi/form_options.php')
}

export function useTicketFormOptions() {
  return useQuery({ queryKey: ['tickets', 'form-options'], queryFn: fetchTicketFormOptions, staleTime: 1000 * 60 * 10 })
}

// Request types (c_ticket_type) of the list's type filter.
export function useTicketTypeOptions() {
  return useQuery({
    queryKey: ['tickets', 'form-options'],
    queryFn: fetchTicketFormOptions,
    staleTime: 1000 * 60 * 10,
    select: (o) => o.types,
  })
}

// ticket/fapi/status.php?action=set_status (API #396, POST {track_id, status}; status is an id 0,1,2,3,5,7,8,9 or a code): the list's quick status
// change. A missing track_id or a bad status answers 422, an unknown ticket 404, a closed or cancelled ticket 409 (the message is shown as it comes).
export async function setTicketStatus(trackId: string, status: number | string): Promise<{ track_id: string; ref: string; status: { id: number; label: string } }> {
  return fapiPost('/ticket/fapi/status.php', { track_id: trackId, status }, { action: 'set_status' })
}

export function useChangeTicketStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ trackId, status }: { trackId: string; status: number }) => setTicketStatus(trackId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })
}

// The 2 JSON APIs wired here. ticket_list_ajax.php is a DataTables handler
// (hasRight('ticket','read')), used for both "List" and "My Assigned
// Tickets" (same endpoint, mode=mine); its response also carries jobcards
// (linked fichinter refs) and date_close. ticket_stats_ajax.php is a
// dashboard-counts endpoint (same permission check) whose by_status[]
// entries carry hex colors, and whose created_by_me_today/
// assigned_to_me_today fields back the "Today: N" badges on the My
// Tickets/Assigned to Me cards. A third endpoint, ticket-side-list-ajax.php,
// exists but is NOT used here — it has no permission check and an
// unescaped SQL LIKE clause (an SQL-injection surface), reported not fixed
// per frontend-only scope.

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
  // YYYY-MM-DD of the creation date when the answer carries it in a form that can be read ('' otherwise): what the date-range filter compares.
  createdDay?: string
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
  // Request type code (c_ticket_type) — the classic filter's search_type_code.
  typeCode?: string
  // Real `projectid` param too (confirmed in the same source read: both
  // ticket_list_ajax.php and ticket_stats_ajax.php read $_POST['projectid']
  // and add "AND t.fk_project = X" server-side) — used to scope this list
  // to one project's tickets from ProjectDetail.tsx.
  projectId?: number
}

function toMDY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

// ticket/fapi/list.php (API #395, key-authenticated, read-only): the List and My Tickets of the Ticket menu. Read live on newecuenta on 10 Nov 2026
// with the filters below; the instance has no tickets, so the row shape is the one the API doc gives (not seen with rows):
//   ?status=open|closed|<id>&type_code&severity_code&category_code&assigned=<user id>&mine=1&search&page&limit
//   item { id, ref, track_id, subject, type {code, label}, severity {code, label}, category_code, status {id, label}, progress, customer {id, name},
//          assigned_to {id, name}, created_by {id, name}, date_create, date_read, date_close }
// Not in the answer, so not filtered or shown from it: a date range, the author, the project, the linked job cards and the customer's town.
// The date range and the author filter are applied here to the rows that were read; a list scoped to a project still reads the classic handler.
interface FapiTicket {
  id: number
  ref: string
  track_id: string
  subject: string
  type?: { code: string; label: string } | null
  severity?: { code: string; label: string } | null
  category_code?: string | null
  status: { id: number; label: string }
  progress?: number | null
  customer?: { id: number; name: string } | null
  assigned_to?: { id: number; name: string } | null
  created_by?: { id: number; name: string } | null
  date_create?: string | number | null
  date_read?: string | number | null
  date_close?: string | number | null
}

const pad = (n: number) => String(n).padStart(2, '0')

// A date of the answer as shown: epoch seconds become "YYYY-MM-DD HH:mm" (UTC), text is shown as it is.
export function ticketDateText(v: string | number | null | undefined): string {
  if (typeof v === 'number' && v > 0) {
    const d = new Date(v * 1000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }
  return typeof v === 'string' ? v : ''
}

const dayOf = (v: string | number | null | undefined) => /^(\d{4}-\d{2}-\d{2})/.exec(ticketDateText(v))?.[1] ?? ''

export function mapFapiTicket(t: FapiTicket): TicketRow {
  return {
    id: t.id,
    trackId: t.track_id,
    statusCode: t.status.id,
    ref: t.ref,
    author: t.created_by?.name ?? '',
    authorUserId: t.created_by ? String(t.created_by.id) : null,
    subject: t.subject,
    type: t.type?.label ?? '',
    thirdParty: t.customer?.name ?? '',
    thirdPartySubtitle: '',
    thirdPartySocid: t.customer ? String(t.customer.id) : null,
    jobcards: '',
    dateCreate: ticketDateText(t.date_create),
    createdDay: dayOf(t.date_create),
    dateClose: ticketDateText(t.date_close),
    assignedTo: t.assigned_to?.name ?? '',
    assignedToUserId: t.assigned_to ? String(t.assigned_to.id) : null,
    status: t.status.label,
  }
}

// The list's status filter values as the API takes them: "Open (All)" and "Closed (All)" are its open / closed groups, a number is one status, "All"
// sends no status.
export function ticketStatusParam(value: string): string | undefined {
  if (value === 'openall') return 'open'
  if (value === 'closeall') return 'closed'
  return value === '-1' || value === '' ? undefined : value
}

// Every page of the tickets (200 each, capped at 25 pages), the other pages read together.
export async function loadFapiTickets(filters: Pick<TicketListFilters, 'status' | 'mine' | 'assignedToUserId' | 'search' | 'typeCode'>, signal?: AbortSignal): Promise<TicketRow[]> {
  const read = (page: number) =>
    fapiGet<{ items: FapiTicket[]; pagination?: { pages?: number } }>(
      '/ticket/fapi/list.php',
      {
        status: ticketStatusParam(filters.status),
        mine: filters.mine ? 1 : undefined,
        assigned: filters.assignedToUserId || undefined,
        search: filters.search || undefined,
        type_code: filters.typeCode || undefined,
        page,
        limit: 200,
      },
      signal,
    )
  const first = await read(1)
  const pages = Math.min(first.pagination?.pages ?? 1, 25)
  const rest = await Promise.all(Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => read(i + 2)))
  return [...first.items, ...rest.flatMap((r) => r.items)].map(mapFapiTicket)
}

// The filters the API has no parameter for, applied to the rows that were read.
export function narrowTickets(rows: TicketRow[], filters: Pick<TicketListFilters, 'dateFrom' | 'dateTo' | 'createdByUserId'>): TicketRow[] {
  return rows.filter((r) => {
    if (filters.createdByUserId && r.authorUserId !== filters.createdByUserId) return false
    if (filters.dateFrom && (!r.createdDay || r.createdDay < filters.dateFrom)) return false
    if (filters.dateTo && (!r.createdDay || r.createdDay > filters.dateTo)) return false
    return true
  })
}

// The classic handler (session): only for a list scoped to a project, which ticket/fapi/list.php cannot filter. Every row in one request (length=-1).
async function loadClassicTickets(filters: TicketListFilters): Promise<TicketRow[]> {
  const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
  if (filters.status) body.set('search_fk_status', filters.status)
  if (filters.mine) body.set('mode', 'mine')
  if (filters.dateFrom && filters.dateTo) body.set('datefilter', `${toMDY(filters.dateFrom)} - ${toMDY(filters.dateTo)}`)
  if (filters.assignedToUserId) body.set('search_fk_user_assign', filters.assignedToUserId)
  if (filters.createdByUserId) body.set('search_fk_user_create', filters.createdByUserId)
  if (filters.search) body.set('search[value]', filters.search)
  if (filters.typeCode) body.set('search_type_code', filters.typeCode)
  if (filters.projectId) body.set('projectid', String(filters.projectId))
  const res = await fetch('/ticket/ticket_list_ajax.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data: RawTicketListResponse = await res.json()
  if (data.error) throw new Error(data.error)
  return data.aaData.map(mapTicketRow)
}

export function useTicketsList(filters: TicketListFilters, page: number, length: number) {
  const classic = Boolean(filters.projectId)
  // The rows are read once per server-side filter; the date range, the author and the page are applied to them.
  const { dateFrom, dateTo, createdByUserId, ...server } = filters
  return useQuery({
    queryKey: ['tickets', 'list', classic ? 'classic' : 'api', classic ? filters : server],
    queryFn: ({ signal }) => (classic ? loadClassicTickets(filters) : loadFapiTickets(filters, signal)),
    select: (all): { rows: TicketRow[]; total: number; filtered: number } => {
      const rows = classic ? all : narrowTickets(all, { dateFrom, dateTo, createdByUserId })
      return { rows: rows.slice(page * length, (page + 1) * length), total: all.length, filtered: rows.length }
    },
    staleTime: 1000 * 30,
  })
}

// A ticket page reads the tickets of every status and picks its row: ticket/fapi has no read-one endpoint, and its list row carries the type, the
// severity, the category code, the progress, the read date and the close date (TicketDetail shows what the row has).
export function useTicketDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'detail', id],
    queryFn: async (): Promise<TicketRow | null> => {
      const rows = await loadFapiTickets({ status: '-1', mine: false })
      return rows.find((r) => String(r.id) === id) ?? null
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
export function useTicketStats(projectId?: number) {
  return useQuery({
    queryKey: ['tickets', 'stats', projectId ?? 'all'],
    queryFn: async (): Promise<TicketStats> => {
      const body = projectId ? new URLSearchParams({ projectid: String(projectId) }) : undefined
      const res = await fetch('/ticket/ticket_stats_ajax.php', { method: 'POST', credentials: 'same-origin', body })
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
