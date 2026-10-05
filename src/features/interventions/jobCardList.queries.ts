import { useQuery } from '@tanstack/react-query'
import { fetchLegacyText, parseLegacyJson } from '../../shared/legacyHtmlFetch'

// The classic "List of JobCards" page (fichinter/list.php, the Ticket menu's
// "Intervention" entry): its rows come from fichinter_ajax.php, a DataTables
// handler (draw/recordsTotal/data shape, ficheinter.lire right) whose cells
// are getNomUrl()/getLibStatut() HTML; its four cards are printed by list.php
// itself, so they are read off that page.

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

export interface RawJobCardRow {
  rowid: string | number
  ref: string
  company: string
  description: string | null
  job_alloted_to: string
  date_in: string
  date_out: string
  created: string
  status: string
}

const parse = (html: string | null | undefined) => new DOMParser().parseFromString(html ?? '', 'text/html')
const text = (node: Element | Document | null | undefined) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
const idFrom = (href: string | null | undefined, param: string) => {
  const m = new RegExp(`[?&]${param}=(\\d+)`).exec(href ?? '')
  return m && Number(m[1]) > 0 ? Number(m[1]) : null
}

export function parseJobCardRow(raw: RawJobCardRow): JobCardRow {
  const companyDoc = parse(raw.company)
  const companyLink = companyDoc.querySelector('a')
  companyLink?.querySelector('.avatar-circle')?.remove()
  const userDoc = parse(raw.job_alloted_to)
  const userLink = userDoc.querySelector('a')
  // "vox_admin<br><span>05/28/2026</span>" — the author's login, then the creation date.
  const [createdBy, createdOnHtml] = String(raw.created ?? '').split(/<br\s*\/?>/i)
  const statusDoc = parse(raw.status)
  const badge = statusDoc.querySelector('.badge')
  const badgeCode = badge ? /badge-status(\d+)/.exec(badge.className) : null
  return {
    id: Number(raw.rowid),
    ref: text(parse(raw.ref).body),
    company: text(companyLink ?? companyDoc.body),
    companyId: idFrom(companyLink?.getAttribute('href'), 'socid'),
    companySubtitle: text(companyDoc.querySelector('small')),
    description: text(parse(raw.description).body),
    allottedTo: text(userDoc.querySelector('.usertext') ?? userLink),
    allottedToId: idFrom(userLink?.getAttribute('href'), 'id'),
    dateIn: raw.date_in ?? '',
    dateOut: raw.date_out ?? '',
    createdBy: text(parse(createdBy).body),
    createdOn: text(parse(createdOnHtml).body),
    status: text(badge ?? statusDoc.body),
    statusBadge: badgeCode ? Number(badgeCode[1]) : null,
  }
}

// Every row in one request (length=-1 skips the handler's LIMIT); paging and
// search happen on the page, like this app's other "fetch once" lists.
export function useJobCards() {
  return useQuery({
    queryKey: ['job-cards', 'list'],
    queryFn: async (): Promise<{ rows: JobCardRow[]; total: number }> => {
      const body = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '-1',
        'order[0][column]': '0',
        'order[0][dir]': 'desc',
        socid: '0',
        vehid: '',
        search_ref: '',
        search_company: '',
        search_status: '-1',
      })
      const res = await fetch('/fichinter/fichinter_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ recordsTotal: string | number; data: RawJobCardRow[] }>(res)
      return { rows: (data.data ?? []).map(parseJobCardRow), total: Number(data.recordsTotal) || 0 }
    },
    staleTime: 1000 * 30,
  })
}

export interface JobCardStat {
  title: string
  value: string
  sub: string
}

// list.php's own cards: Total Job Cards, Created Today, Total Customers, Total Vehicles.
export function parseJobCardStats(html: string): JobCardStat[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('.ec-report-stats-content'), (card) => ({
    title: text(card.querySelector('.ec-report-stats-title')),
    value: text(card.querySelector('.ec-report-stats-value')),
    sub: text(card.querySelector('.ec-report-stats-sub')),
  })).filter((s) => s.title)
}

export function useJobCardStats() {
  return useQuery({
    queryKey: ['job-cards', 'stats'],
    queryFn: async () => parseJobCardStats(await fetchLegacyText('/fichinter/list.php')),
    staleTime: 1000 * 30,
  })
}
