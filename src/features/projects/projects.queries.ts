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
// Real source found instead: projet/projects-list-ajax.php, a genuine
// DataTables JSON endpoint over llx_projet (confirmed live). It only
// selects 5 raw columns (rowid, ref, title, fk_statut, third-party name) —
// no dates, budget, visibility, description or lead/opportunity fields, so
// those stay unavailable rather than guessed. This also means the legacy
// "Open Leads" vs "Open Projects" distinction (which hinges on the
// opportunity-tracking flag this endpoint doesn't return) can't be
// faithfully reproduced — both fall back to the same "open" filter.
//
// The backend also hardcodes its own page size to 25 (`$length = 25;`,
// ignoring whatever `length` is sent) — same limitation as the standalone
// Contacts module's list-ajax endpoint. Harmless on this DB (2 real
// projects today), but a genuine cap if the table grows past 25 rows.
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

function toProjectRow(r: RawProjectListRow): ProjectRow {
  const statusCode = Number(r.fk_statut)
  return {
    id: Number(r.rowid),
    ref: r.ref,
    title: r.title,
    thirdPartyName: r.nom || null,
    statusCode,
    statusLabel: STATUS_LABELS[statusCode] ?? 'Unknown',
  }
}

export function useProjectsList(filter: ProjectListFilter) {
  return useQuery({
    queryKey: ['projects', 'list', filter],
    queryFn: async (): Promise<{ items: ProjectRow[]; total: number }> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
      const { data } = await axios.post<ProjectsAjaxResponse>('/projet/projects-list-ajax.php', body)
      const rows = (data.data ?? []).map(toProjectRow)
      const items = filter === 'all' ? rows : rows.filter((r) => r.statusCode === 1)
      return { items, total: items.length }
    },
    staleTime: 1000 * 30,
  })
}
