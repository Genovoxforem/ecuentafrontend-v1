import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Network, Plus, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useProjectsList, type ProjectListFilter, type ProjectRow } from '../projects.queries'
import { ROUTES } from '../../../routes'

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-surface-hover text-text-muted',
  Open: 'bg-success-bg text-success-fg',
  Closed: 'bg-danger-bg text-danger-fg',
  Unknown: 'bg-surface-hover text-text-muted',
}

type SortKey = 'ref' | 'title' | 'thirdParty' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Project Label', key: 'title' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(p: ProjectRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return p.ref
    case 'title':
      return p.title
    case 'thirdParty':
      return p.thirdPartyName || ''
    case 'status':
      return p.statusLabel
  }
}

function matchesSearch(p: ProjectRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [p.ref, p.title, p.thirdPartyName || '', p.statusLabel].some((f) => f.toLowerCase().includes(q))
}

// Real POST projet/projects-list-ajax.php data (see projects.queries.ts).
// Validate/Clone/Delete row actions from the old dead /api/projects/ are
// gone — no real API exists for any of them any more (that module has no
// JSON create/update/delete surface at all, only this thin read-only
// list) — so this table is read-only, honestly, rather than pretending
// buttons still work.
export function ProjectsListPage({ filter, title }: { filter: ProjectListFilter; title: string }) {
  const { data, isLoading, isError, error } = useProjectsList(filter)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => (data?.items ?? []).filter((p) => matchesSearch(p, search)), [data, search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<ProjectRow, SortKey>(filteredRows, sortValue)
  const pageRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedRows.map((p) => [p.ref, p.title, p.thirdPartyName || '—', p.statusLabel])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Network size={20} className="text-brand" /> {title}
        </h2>
        <Link to={ROUTES.projectCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Project
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load projects.'}</Card>
        )}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title={title} getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="py-4 px-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="py-4 px-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="py-4 px-4 text-text-faint italic">
                      No projects match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Link to={ROUTES.projectDetail.replace(':id', String(p.id))} className="text-brand font-medium hover:underline">
                          {p.ref}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-text!">{p.title}</td>
                      <td className="py-2.5 px-4 text-text-muted">{p.thirdPartyName || '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[p.statusLabel]}`}>{p.statusLabel}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-text-faint italic">Start Date, End Date, Visibility and Budget aren't returned by the real Projects list endpoint on this backend — not shown to avoid guessing.</p>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
