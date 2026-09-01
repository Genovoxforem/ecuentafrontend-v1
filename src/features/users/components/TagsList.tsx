import { useMemo, useState } from 'react'
import { Tags, Search, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useUserTagsList, type UserTagRow } from '../userGroupsAndTags.queries'
import { formatDate } from '../../../utils/format'
import { DisabledFormModal } from '../../../shared/components/forms/DisabledFormModal'

type SortKey = 'name' | 'color' | 'created'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Name', key: 'name' },
  { label: 'Color', key: 'color' },
  { label: 'Created', key: 'created' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(t: UserTagRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return t.name
    case 'color':
      return t.color
    case 'created':
      return t.createdAt ? new Date(t.createdAt).getTime() : 0
  }
}

function matchesSearch(t: UserTagRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return t.name.toLowerCase().includes(q)
}

// Real via categories/tag-sidebarlist-ajax.php?type_id=7 (Categorie::
// TYPE_USER — see userGroupsAndTags.queries.ts's header comment). The
// reference page's per-tag member-count badge has no JSON source (only
// categories/index.php's own server-rendered tree computes it, via a PHP
// class method with no ajax equivalent), so this shows each tag's real
// creation date instead of a fabricated/scraped count. "Add Tag" has no
// real API either (categories/card.php is a classic form-POST-and-redirect
// page) — kept as a legacy-system link rather than a fake in-app form.
export function TagsList() {
  const { data: tags, isLoading, isError, error } = useUserTagsList()
  const [showAddTag, setShowAddTag] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => (tags ?? []).filter((t) => matchesSearch(t, search)), [tags, search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<UserTagRow, SortKey>(filteredRows, sortValue)
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
    const rows = sortedRows.map((t) => [t.name, t.color ? `#${t.color}` : '', t.createdAt ? formatDate(t.createdAt) : '—'])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tags size={20} className="text-brand" /> Users Tags/Categories
        </h2>
        <button type="button" onClick={() => setShowAddTag(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add Tag
        </button>
      </div>

      {showAddTag && (
        <DisabledFormModal
          icon={Tags}
          title="Add Tag"
          sourcePath="categories/card.php?action=create&type=7"
          fields={[
            { label: 'Label', required: true },
            { label: 'Color', type: 'text' },
            { label: 'Parent Category', type: 'select' },
            { label: 'Description', type: 'textarea' },
          ]}
          onClose={() => setShowAddTag(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : "Couldn't load tags."}</Card>
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
                placeholder="Name"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Users Tags" getExportData={getExportData} />
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
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      Loading…
                    </td>
                  </tr>
                ) : !tags || tags.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No tags match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((tag) => (
                    <tr key={tag.id} className="border-b border-border">
                      <td className="px-4 py-3 text-text!">{tag.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-text-muted">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ? `#${tag.color}` : '#397db9' }} />
                          {tag.color ? `#${tag.color}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{tag.createdAt ? formatDate(tag.createdAt) : '—'}</td>
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
