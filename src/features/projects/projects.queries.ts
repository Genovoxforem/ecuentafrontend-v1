import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { readSessionCache, writeSessionCache } from '../../utils/sessionCache'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages } from '../../api/fapiRow'

// There is no /api/projects/ (api/projects/index.php) on the active backend
// (a GET to it returns the legacy login page's HTML; only the unrelated
// read-only api/projects.php dropdown dictionary exists, used for Project
// select fields). The generic Dolibarr Restler layer
// (projet/class/api_projects.class.php) requires a DOLAPIKEY header — a
// different auth model than everything else in this app — and there's no
// bridge exposing it under this app's session-cookie/X-API-Key scheme.
// Building one would be a backend PHP change, out of scope.
//
// Primary source: projet/list.php — classic Dolibarr HTML (no json_encode
// anywhere in that file). Its own GET filters are what the reference app's
// filter-icon dropdown links to:
//   List (no filter):        no extra params
//   List Open Leads:         search_opp_status=openedopp&search_status=99
//   List Open Projects:      search_opp_status=notopenedopp&search_status=99
// search_status=99 means "fk_statut <> 2" (anything but Closed); openedopp
// means "has an opportunity status set, and it isn't WON/LOST" (a lead still
// being pursued); notopenedopp means "no opportunity tracking, or WON" (a
// project, not an in-progress lead). This server-side distinction can't be
// reproduced from the secondary source below, which doesn't expose
// fk_opp_status at all.
//
// Secondary source: projet/projects-list-ajax.php, a DataTables JSON
// endpoint over llx_projet. It only selects 5 raw columns (rowid, ref,
// title, fk_statut, third-party name) and hardcodes its own page size to 25
// (`$length = 25;`, ignoring whatever `length` is sent — same limitation as
// the standalone Contacts module's list-ajax endpoint). It's used here only
// to enrich each row with a third-party name, since this install's own
// arrayfields config doesn't render a Company column on projet/list.php at
// all — no other source for that field exists.
//
// projet/card.php (create/view) has no JSON API at all (no json_encode
// anywhere in that file) — see ProjectCreateForm.tsx and ProjectDetail.tsx.

export type ProjectListFilter = 'all' | 'openLeads' | 'openProjects'

export interface ProjectOpportunity {
  statusId: number
  code: string
  label: string
  percent: number | null
  amount: number | null
}

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
  // From the project card only (projet/fapi/projects.php?id=): not in a list row.
  description?: string
  usage?: { opportunity: boolean; task: boolean; billTime: boolean }
  // The opportunity of a lead (null: the project does not follow one). Also in a list row.
  opportunity?: ProjectOpportunity | null
}

const STATUS_LABELS: Record<number, ProjectRow['statusLabel']> = { 0: 'Draft', 1: 'Open', 2: 'Closed' }

// projet/fapi/projects.php (key-authenticated JSON, 5 Nov 2026). Checked on newecuenta the same day against the classic projet/list.php
// and projet/card.php, with four throwaway projects (a lead, one without an opportunity, a Won and a Lost one; all deleted again):
//  - a list row has id, ref, title, third_party, status (0 draft, 1 open, 2 closed), opportunity {status_id, code, label, amount, percent},
//    budget_amount, public, date_start / date_end / date_creation (Unix seconds, UTC) and creator. The classic list prints the same as
//    Start date, End date (blank when none), Visibility ("Project contacts" / "Everybody"), Budget ("1,000.00", blank when 0) and
//    Creat. date ("11/05/2026 10:44 AM", UTC).
//  - its filter=open_leads / open_projects leave out draft projects (the classic lists include them) and open_projects includes a Lost
//    opportunity (the classic list does not), so the three lists are cut here from the full list with the classic rule instead:
//    Open Leads = has an opportunity that is not Won or Lost, Open Projects = no opportunity or a Won one, neither = closed projects.
//    That gave exactly the classic lists with the projects draft, open, and after one was closed.
interface FapiProjectOpportunity {
  status_id: number
  code: string
  label: string
  amount: number | null
  percent: number | null
}
interface FapiProject {
  id: number
  ref: string
  title: string
  description?: string
  third_party?: { id?: number; name?: string } | null
  status?: number
  opportunity?: FapiProjectOpportunity | null
  budget_amount?: number | null
  public?: boolean
  usage_flags?: { opportunity?: number; task?: number; bill_time?: number }
  date_start?: number | null
  date_end?: number | null
  date_creation?: number | null
}
const FAPI_PAD = (n: number) => String(n).padStart(2, '0')
// Dates print as the classic list does, in UTC ("11/05/2026"; the stored dates are midnight UTC).
const projectDate = (v: number | null | undefined): string | null => {
  if (typeof v !== 'number') return null
  const d = new Date(v * 1000)
  return `${FAPI_PAD(d.getUTCMonth() + 1)}/${FAPI_PAD(d.getUTCDate())}/${d.getUTCFullYear()}`
}
const projectDateTime = (v: number | null | undefined): string | null => {
  if (typeof v !== 'number') return null
  const d = new Date(v * 1000)
  const h = d.getUTCHours()
  return `${projectDate(v)} ${FAPI_PAD(h % 12 || 12)}:${FAPI_PAD(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`
}

function mapFapiProject(p: FapiProject): ProjectRow {
  const statusCode = p.status ?? -1
  const o = p.opportunity
  return {
    id: p.id,
    ref: p.ref,
    title: p.title,
    thirdPartyName: p.third_party?.name ?? null,
    statusCode,
    statusLabel: STATUS_LABELS[statusCode] ?? 'Unknown',
    startDate: projectDate(p.date_start),
    endDate: projectDate(p.date_end),
    visibility: p.public === undefined ? null : p.public ? 'Everybody' : 'Project contacts',
    budgetAmount: p.budget_amount ? p.budget_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null,
    creationDate: projectDateTime(p.date_creation),
    opportunity: o ? { statusId: o.status_id, code: o.code, label: o.label, percent: o.percent, amount: o.amount } : null,
    ...(p.description !== undefined ? { description: p.description } : {}),
    ...(p.usage_flags ? { usage: { opportunity: !!p.usage_flags.opportunity, task: !!p.usage_flags.task, billTime: !!p.usage_flags.bill_time } } : {}),
  }
}

// The classic filters (search_opp_status=openedopp / notopenedopp with search_status=99, i.e. not closed).
export function matchesProjectFilter(p: ProjectRow, filter: ProjectListFilter): boolean {
  if (filter === 'all') return true
  if (p.statusCode === 2) return false
  const code = p.opportunity?.code
  return filter === 'openLeads' ? !!code && code !== 'WON' && code !== 'LOST' : !code || code === 'WON'
}

async function fetchProjectsFapi(filter: ProjectListFilter): Promise<{ items: ProjectRow[]; total: number }> {
  const rows = await fetchAllPages<FapiProject>((page) =>
    fapiGet<{ items?: FapiProject[]; pagination?: { pages?: number } }>('/projet/fapi/projects.php', { action: 'list', filter: 'all', limit: 500, page }),
  )
  const items = rows.map(mapFapiProject).filter((p) => matchesProjectFilter(p, filter))
  return { items, total: items.length }
}

export function useProjectsList(filter: ProjectListFilter) {
  return useQuery({
    queryKey: ['projects', 'list', filter],
    queryFn: () => fetchProjectsFapi(filter),
    staleTime: 1000 * 30,
  })
}

// One project: the card of projet/fapi/projects.php?id= (description, usage flags and the opportunity too). An unknown id is a JSON 404
// ("Project not found or not visible").
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: async () => mapFapiProject((await fapiGet<{ project: FapiProject }>('/projet/fapi/projects.php', { id })).project),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// The navbar's "Today New Leads" pill: projects.php?action=count&filter=open_leads&created=today, no list download. Since 11 Nov 2026 the backend counts drafts
// too (open = not closed, opportunity not Won / Lost). Tested live on newecuenta on 12 Nov 2026 with throwaway projects, all deleted again: the count equals the rows of
// the classic Open Leads list (projet/list.php?search_opp_status=openedopp&search_status=99) in every state - draft lead 1, a Won lead and a project without an
// opportunity not counted, the lead validated still 1, closed 0. "Today" is the server's day.
async function countTodayLeadsFapi(): Promise<number> {
  const d = await fapiGet<{ count?: number }>('/projet/fapi/projects.php', { action: 'count', filter: 'open_leads', created: 'today' })
  return Number(d.count) || 0
}

// Asked once per sign-in and kept for the browser session (per user and per day): a reload or another tab does not ask again.
export function useTodayNewLeadsCount() {
  const { user } = useAuth()
  const cacheKey = `todayNewLeads:${user?.id}:${new Date().toDateString()}`
  return useQuery({
    queryKey: ['projects', 'todayNewLeads', user?.id],
    initialData: () => readSessionCache<number>(cacheKey),
    queryFn: async (): Promise<number> => {
      const count = await countTodayLeadsFapi()
      writeSessionCache(cacheKey, count)
      return count
    },
    staleTime: Infinity,
    retry: false,
  })
}
