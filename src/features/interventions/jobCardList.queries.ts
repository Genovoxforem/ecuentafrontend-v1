import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// "List of JobCards" (the Ticket menu's "Intervention" entry): rows from fichinter/fapi/list.php, cards from fichinter/fapi/stats.php (fapi only).

export interface JobCardRow {
  id: number
  ref: string
  company: string
  companyId: number | null
  companySubtitle: string
  description: string
  allottedTo: string
  allottedToId: number | null
  dateIn: string
  dateOut: string
  createdBy: string
  createdOn: string
  status: string
  // N of the status badge's badge-statusN class (0 draft, 1 validated, …).
  statusBadge: number | null
}

// fichinter/fapi/list.php: the same job cards as JSON, read page by page. It carries no allotted-to, in/out
// date time or created-by, so those columns stay empty (master report). The classic fichinter_ajax.php handler is no longer read.
interface FapiJobCard {
  id?: number
  ref?: string
  party?: { id?: number | null; name?: string } | null
  status?: number
  status_label?: string
  description?: string | null
  date_creation?: string
}

async function fetchJobCardsFapi(): Promise<{ rows: JobCardRow[]; total: number }> {
  const rows: JobCardRow[] = []
  let total = 0
  for (let page = 1; ; page++) {
    const d = await fapiGet<{ items?: FapiJobCard[]; pagination?: { total?: number; pages?: number } }>('/fichinter/fapi/list.php', { page, limit: 100 })
    for (const j of d.items ?? [])
      rows.push({
        id: Number(j.id),
        ref: j.ref ?? '',
        company: j.party?.name ?? '',
        companyId: j.party?.id ?? null,
        companySubtitle: '',
        description: j.description ?? '',
        allottedTo: '',
        allottedToId: null,
        dateIn: '',
        dateOut: '',
        createdBy: '',
        createdOn: j.date_creation ?? '',
        status: j.status_label ?? '',
        statusBadge: j.status === 0 || j.status === 1 ? j.status : null,
      })
    total = Number(d.pagination?.total) || rows.length
    if (page >= (Number(d.pagination?.pages) || 0)) break
  }
  return { rows, total }
}

// Every row in one request (length=-1 skips the handler's LIMIT); paging and
// search happen on the page, like this app's other "fetch once" lists.
export function useJobCards() {
  return useQuery({
    queryKey: ['job-cards', 'list'],
    queryFn: fetchJobCardsFapi,
    staleTime: 1000 * 30,
  })
}

export interface JobCardStat {
  title: string
  value: string
  sub: string
}

// fichinter/fapi/stats.php (API #398, key-authenticated, read-only; filters socid, project, date_from, date_to), read live on newecuenta on 10 Nov 2026:
//   { total, by_status [{id, code, label, count, duration_seconds}] (Draft, Validated, Invoiced, Done), total_duration_seconds, open, closed }
// The classic cards Created Today, Total Customers and Total Vehicles are not in it, so the cards are the ones the answer has.
export interface FapiJobCardStats {
  total: number
  by_status: Array<{ id: number; code: string; label: string; count: number; duration_seconds: number }>
  total_duration_seconds: number
  open: number
  closed: number
}

// 5430 s -> "1 h 30 min"
export function durationText(seconds: number): string {
  const minutes = Math.round((Number(seconds) || 0) / 60)
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

export function jobCardStatsCards(s: FapiJobCardStats): JobCardStat[] {
  return [
    { title: 'Total Job Cards', value: String(s.total), sub: s.by_status.map((b) => `${b.label} ${b.count}`).join(' · ') },
    { title: 'Open', value: String(s.open), sub: 'Job cards not closed yet' },
    { title: 'Closed', value: String(s.closed), sub: 'Job cards closed' },
    { title: 'Total Time', value: durationText(s.total_duration_seconds), sub: 'Duration of all job cards' },
  ]
}

export function useJobCardStats() {
  return useQuery({
    queryKey: ['job-cards', 'stats'],
    queryFn: async () => jobCardStatsCards(await fapiGet<FapiJobCardStats>('/fichinter/fapi/stats.php')),
    staleTime: 1000 * 30,
  })
}
