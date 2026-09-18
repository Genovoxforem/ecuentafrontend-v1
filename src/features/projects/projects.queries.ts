import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

// The /api/projects/ (api/projects/index.php) this file used to call is
// gone from the active backend — confirmed live (a GET to it returns the
// legacy login page's HTML, not JSON; no api/projects/ directory exists on
// disk at all, only the unrelated read-only api/projects.php dropdown
// dictionary already used elsewhere for Project select fields). The
// generic Dolibarr Restler layer this bridge used to wrap
// (projet/class/api_projects.class.php) is still real, but — same
// situation as Contracts' equivalent — it requires a DOLAPIKEY header, a
// different auth model than everything else in this app, and there's no
// bridge exposing it under this app's own session-cookie/X-API-Key scheme
// any more. Building one would be a backend PHP change, out of scope.
//
// Real primary source: projet/list.php — genuinely classic Dolibarr HTML
// (no json_encode anywhere in that file, confirmed by reading it directly).
// Its own real GET filters are what the reference app's filter-icon dropdown
// itself links to (read directly from source, not guessed):
//   List (no filter):        no extra params
//   List Open Leads:         search_opp_status=openedopp&search_status=99
//   List Open Projects:      search_opp_status=notopenedopp&search_status=99
// search_status=99 means "fk_statut <> 2" (anything but Closed); openedopp
// means "has an opportunity status set, and it isn't WON/LOST" (a lead still
// being pursued); notopenedopp means "no opportunity tracking, or WON" (a
// real project, not an in-progress lead). This is a genuine, meaningful
// server-side distinction this app previously couldn't reproduce (both
// filters used to alias to the same "open" filter) because the OTHER real
// source below doesn't expose fk_opp_status at all.
//
// Real secondary source: projet/projects-list-ajax.php, a genuine DataTables
// JSON endpoint over llx_projet (confirmed live). It only selects 5 raw
// columns (rowid, ref, title, fk_statut, third-party name) and hardcodes its
// own page size to 25 (`$length = 25;`, ignoring whatever `length` is sent —
// same limitation as the standalone Contacts module's list-ajax endpoint).
// It's used here only to enrich each row with a third-party name, since
// this install's own arrayfields config doesn't render a Company column on
// projet/list.php at all (confirmed live) — no real source for that field
// exists anywhere else.
//
// projet/card.php (create/view) has no JSON API at all (checked directly:
// no json_encode anywhere in that file) — see ProjectCreateForm.tsx and
// ProjectDetail.tsx for how each is honest about that.

export type ProjectListFilter = 'all' | 'openLeads' | 'openProjects'

export interface ProjectRow {
  id: number
  ref: string
  title: string
  thirdPartyName: string | null
  statusCode: number
  statusLabel: 'Draft' | 'Open' | 'Closed' | 'Unknown'
  startDate: string | null
  endDate: string | null
  visibility: string | null
  budgetAmount: string | null
  creationDate: string | null
}

interface RawProjectListRow {
  rowid: string
  ref: string
  title: string
  fk_statut: string
  nom: string | null
}

interface ProjectsAjaxResponse {
  recordsTotal: string | number
  data: RawProjectListRow[]
}

const STATUS_LABELS: Record<number, ProjectRow['statusLabel']> = { 0: 'Draft', 1: 'Open', 2: 'Closed' }
const STATUS_CODES_BY_LABEL: Record<string, number> = { draft: 0, open: 1, validated: 1, closed: 2 }

function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// projet/list.php's own table has a distinctive id="example" — a much safer
// anchor than searching for the first <thead>/<tbody> on the page, since a
// shared "Cash Position" finance widget elsewhere on this same page layout
// has its own real <thead>/<tbody> earlier in the document (the same trap
// that broke an earlier version of the Replenishment Orders scraper).
// Column order (Ref/Project label/Start date/End date/Visibility/Budget/
// Creat. date/Status) matches this install's own configured arrayfields,
// confirmed live — not hardcoded from Dolibarr's generic default.
function parseProjectListRows(html: string): Omit<ProjectRow, 'thirdPartyName'>[] {
  const tableStart = html.indexOf('<table id="example"')
  if (tableStart === -1) return []
  const tbodyStart = html.indexOf('<tbody>', tableStart)
  const tbodyEnd = html.indexOf('</tbody>', tbodyStart)
  if (tbodyStart === -1 || tbodyEnd === -1) return []
  const tbodyHtml = html.slice(tbodyStart, tbodyEnd)

  const rows: Omit<ProjectRow, 'thirdPartyName'>[] = []
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(tbodyHtml))) {
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g
    const cells: string[] = []
    let c: RegExpExecArray | null
    while ((c = cellRe.exec(m[1]))) cells.push(c[1])
    if (cells.length < 8) continue

    const idMatch = cells[0].match(/[?&]id=(\d+)/)
    const ref = textOf(cells[0])
    if (!idMatch || !ref) continue

    const statusText = (cells[7].match(/title="([^"]*)"/)?.[1] ?? textOf(cells[7])).trim()
    const statusCode = STATUS_CODES_BY_LABEL[statusText.toLowerCase()] ?? -1
    const statusLabel = STATUS_LABELS[statusCode] ?? 'Unknown'

    rows.push({
      id: Number(idMatch[1]),
      ref,
      title: textOf(cells[1]),
      statusCode,
      statusLabel,
      startDate: textOf(cells[2]) || null,
      endDate: textOf(cells[3]) || null,
      visibility: textOf(cells[4]) || null,
      budgetAmount: textOf(cells[5]) || null,
      creationDate: textOf(cells[6]) || null,
    })
  }
  return rows
}

function buildListUrl(filter: ProjectListFilter): string {
  const params = new URLSearchParams({ limit: '500' })
  if (filter === 'openLeads') {
    params.set('search_opp_status', 'openedopp')
    params.set('search_status', '99')
  } else if (filter === 'openProjects') {
    params.set('search_opp_status', 'notopenedopp')
    params.set('search_status', '99')
  }
  return `/projet/list.php?${params.toString()}`
}

async function fetchThirdPartyByRef(): Promise<Map<string, string>> {
  const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
  const { data } = await axios.post<ProjectsAjaxResponse>('/projet/projects-list-ajax.php', body)
  const map = new Map<string, string>()
  for (const r of data.data ?? []) {
    if (r.nom) map.set(r.ref, r.nom)
  }
  return map
}

export function useProjectsList(filter: ProjectListFilter) {
  return useQuery({
    queryKey: ['projects', 'list', filter],
    queryFn: async (): Promise<{ items: ProjectRow[]; total: number }> => {
      const [html, thirdParties] = await Promise.all([
        fetch(buildListUrl(filter), { credentials: 'same-origin' }).then((res) => {
          if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
          return res.text()
        }),
        fetchThirdPartyByRef(),
      ])
      const items = parseProjectListRows(html).map((r) => ({ ...r, thirdPartyName: thirdParties.get(r.ref) ?? null }))
      return { items, total: items.length }
    },
    staleTime: 1000 * 30,
  })
}
