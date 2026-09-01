import { useQuery } from '@tanstack/react-query'

// The 2 real JSON APIs wired in this pass — confirmed by reading both files
// directly. ticket_list_ajax.php is a real DataTables handler
// (hasRight('ticket','read')), used for both "List" and "My Assigned
// Tickets" (same endpoint, mode=mine). ticket_stats_ajax.php is a real,
// well-built dashboard-counts endpoint (same permission check). A third
// real endpoint, ticket-side-list-ajax.php, exists but is NOT used here —
// confirmed to have zero permission check and an unescaped SQL LIKE clause
// (a live SQL-injection surface), reported not fixed per frontend-only scope.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface TicketRow {
  id: number
  trackId: string
  statusCode: number
  ref: string
  author: string
  subject: string
  type: string
  thirdParty: string
  dateCreate: string
  assignedTo: string
  status: string
}
interface RawTicketListResponse {
  draw: number
  iTotalRecords: number
  iTotalDisplayRecords: number
  aaData: Array<{
    rowid: number
    track_id: string
    fk_statut: number
    ticket_ref: string
    author: string
    subject: string
    type: string
    thirdparty: string
    datec: string
    assigned_to: string
    status: string
  }>
  error?: string
}

export interface TicketListFilters {
  status: string
  mine: boolean
}

export function useTicketsList(filters: TicketListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['tickets', 'list', filters, page, length],
    queryFn: async (): Promise<{ rows: TicketRow[]; total: number; filtered: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      if (filters.status) body.set('search_fk_status', filters.status)
      if (filters.mine) body.set('mode', 'mine')
      const res = await fetch('/ticket/ticket_list_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawTicketListResponse = await res.json()
      if (data.error) throw new Error(data.error)
      return {
        rows: data.aaData.map((r) => ({
          id: r.rowid,
          trackId: r.track_id,
          statusCode: r.fk_statut,
          ref: stripTags(r.ticket_ref),
          author: stripTags(r.author),
          subject: r.subject,
          type: r.type,
          thirdParty: stripTags(r.thirdparty),
          dateCreate: r.datec,
          assignedTo: stripTags(r.assigned_to),
          status: stripTags(r.status),
        })),
        total: data.iTotalRecords,
        filtered: data.iTotalDisplayRecords,
      }
    },
  })
}

export interface TicketStatusCount {
  code: string
  label: string
  color: string
  count: number
}
export interface TicketStats {
  total: number
  today: number
  createdByMe: number
  assignedToMe: number
  byStatus: TicketStatusCount[]
}
interface RawTicketStatsResponse {
  total: number
  today: number
  created_by_me: number
  assigned_to_me: number
  by_status: Array<{ code: string | number; label: string; color: string; count: number }>
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
        assignedToMe: data.assigned_to_me,
        byStatus: data.by_status.map((s) => ({ code: String(s.code), label: s.label, color: s.color, count: s.count })),
      }
    },
    staleTime: 1000 * 30,
  })
}
