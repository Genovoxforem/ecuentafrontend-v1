import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { formatDateTimeAmPm, formatServerDateTime } from '../../utils/format'

// "List of JobCards" (the Ticket menu's "Intervention" entry): rows and stats from fichinter/fapi/list.php,
// with fallback cards from fichinter/fapi/stats.php.

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

// fichinter/fapi/list.php: items gain in_datetime/out_datetime/created_by/created_on (AN-165).
// "Job allotted to" (a contact assignment) is left unresolved per AN-165.
interface FapiJobCard {
  id?: number
  ref?: string
  party?: { id?: number | null; name?: string } | null
  status?: number
  status_label?: string
  description?: string | null
  date_creation?: string
  in_datetime?: string
  out_datetime?: string
  created_by?: string
  created_on?: string
}

export interface FapiJobCardListStats {
  total?: number
  created_today?: number
  customers?: number
  vehicles?: number | null
}

function formatJobCardDateTime(val: string | number | null | undefined): string {
  if (!val) return ''
  if (typeof val === 'number') {
    const d = new Date(val < 1e11 ? val * 1000 : val)
    return Number.isNaN(d.getTime()) ? '' : formatDateTimeAmPm(d)
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) return val
  return formatServerDateTime(val)
}

export function jobCardListStatsCards(s: FapiJobCardListStats): JobCardStat[] {
  return [
    { title: 'Total Job Cards', value: String(s.total ?? 0), sub: 'All job cards' },
    { title: 'Created Today', value: String(s.created_today ?? 0), sub: 'Created today' },
    { title: 'Total Customers', value: String(s.customers ?? 0), sub: 'Customers with interventions' },
    { title: 'Total Vehicles', value: s.vehicles != null ? String(s.vehicles) : '—', sub: 'Vehicles' },
  ]
}

async function fetchJobCardsFapi(): Promise<{ rows: JobCardRow[]; total: number; stats?: JobCardStat[] }> {
  const rows: JobCardRow[] = []
  let total = 0
  let stats: JobCardStat[] | undefined
  for (let page = 1; ; page++) {
    const d = await fapiGet<{
      items?: FapiJobCard[]
      stats?: FapiJobCardListStats
      pagination?: { total?: number; pages?: number }
    }>('/fichinter/fapi/list.php', { page, limit: 100 })
    if (d.stats && !stats) {
      stats = jobCardListStatsCards(d.stats)
    }
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
        dateIn: formatJobCardDateTime(j.in_datetime),
        dateOut: formatJobCardDateTime(j.out_datetime),
        createdBy: j.created_by ?? '',
        createdOn: formatJobCardDateTime(j.created_on ?? j.date_creation),
        status: j.status_label ?? '',
        statusBadge: j.status === 0 || j.status === 1 ? j.status : null,
      })
    total = Number(d.pagination?.total) || rows.length
    if (page >= (Number(d.pagination?.pages) || 0)) break
  }
  return { rows, total, stats }
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
