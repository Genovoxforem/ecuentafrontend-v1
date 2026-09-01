import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { UsersRound, Plus, Pencil, Copy, Search } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useUserGroupsList, type UserGroupRow } from '../userGroupsAndTags.queries'
import { formatDate } from '../../../utils/format'

type SortKey = 'name' | 'created'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Role Name', key: 'name' },
  { label: 'Created', key: 'created' },
]
const COLUMN_LABELS = [...COLUMNS.map((c) => c.label), 'Actions']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(g: UserGroupRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return g.name
    case 'created':
      return g.createdAt ? new Date(g.createdAt).getTime() : 0
  }
}

function matchesSearch(g: UserGroupRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return g.name.toLowerCase().includes(q)
}

// Real via user/group/user-groups-sidebarlist-ajax.php (see
// userGroupsAndTags.queries.ts's header comment for why the reference
// page's "Total N users" count and avatar stack aren't reproduced here —
// no JSON source for that number exists, only the legacy page's own HTML,
// which this app's rules say not to scrape). "Edit Role"/"Duplicate role"
// link out to the real legacy card.php, which isn't rebuilt in this pass.
export function GroupsList() {
  const { data: groups, isLoading, isError, error } = useUserGroupsList()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => (groups ?? []).filter((g) => matchesSearch(g, search)), [groups, search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<UserGroupRow, SortKey>(filteredRows, sortValue)
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
    const rows = sortedRows.map((g) => [g.name, g.createdAt ? formatDate(g.createdAt) : '—'])
    return { headers: COLUMNS.map((c) => c.label), rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UsersRound size={20} className="text-brand" /> List of Groups
        </h2>
        <Link to={ROUTES.userGroupCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add New Role
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : "Couldn't load groups."}</Card>
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
                placeholder="Search roles…"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="List of Groups" getExportData={getExportData} />
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
                  <Th align="right">Actions</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      Loading…
                    </td>
                  </tr>
                ) : !groups || groups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No roles match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((group) => (
                    <tr key={group.id} className="border-b border-border">
                      <td className="px-4 py-3 text-text!">{group.name}</td>
                      <td className="px-4 py-3 text-text-muted">{group.createdAt ? formatDate(group.createdAt) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={ROUTES.userGroupEdit.replace(':id', String(group.id))}
                            title="Permissions editing has no real API — read-only preview matching the legacy layout"
                            className="flex items-center gap-1 text-sm text-brand hover:underline"
                          >
                            <Pencil size={12} /> Edit
                          </Link>
                          <Link
                            to={ROUTES.userGroupEdit.replace(':id', String(group.id))}
                            title="Duplicate role — no real API, same read-only preview"
                            className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text-muted"
                          >
                            <Copy size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
