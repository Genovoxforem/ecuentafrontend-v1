import { useMemo, useState } from 'react'
import { Tags, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useBankAccountCategoriesList, type BankAccountCategoryRow } from '../banking.queries'
import { formatDate } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

type SortKey = 'color' | 'name' | 'createdAt'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Color', key: 'color' },
  { label: 'Name', key: 'name' },
  { label: 'Created', key: 'createdAt' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(category: BankAccountCategoryRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [category.name, category.createdAt ? formatDate(category.createdAt) : ''].some((field) => field.toLowerCase().includes(q))
}

function sortValue(c: BankAccountCategoryRow, key: SortKey): string | number {
  switch (key) {
    case 'color':
      return c.color
    case 'name':
      return c.name
    case 'createdAt':
      return c.createdAt ? new Date(c.createdAt).getTime() || c.createdAt : ''
  }
}

// Real via categories/tag-sidebarlist-ajax.php?type_id=5 (Categorie::
// TYPE_ACCOUNT) — the exact same generic llx_categorie list already used
// for Users Tags this session. Create has no real API (classic
// categories/card.php?action=create&type=bank_account form-POST), so this
// stays read-only, same convention as Users Tags.
export function BankAccountCategoriesList() {
  const { data: categories, isLoading, isError, error, refetch } = useBankAccountCategoriesList()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredCategories = useMemo(() => (categories ?? []).filter((c) => matchesSearch(c, search)), [categories, search])
  const { sorted: sortedCategories, sort, toggleSort } = useSortableRows<BankAccountCategoryRow, SortKey>(filteredCategories, sortValue)
  const pageCategories = sortedCategories.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedCategories.map((c) => [c.color ? `#${c.color}` : '—', c.name, c.createdAt ? formatDate(c.createdAt) : '—'])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tags size={20} className="text-brand" /> Categories
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label="Loading categories…" />}
        {isError && <LegacyErrorCard title="Couldn't load categories" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {categories && (
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
              <TableExportButtons title="Categories" getExportData={getExportData} />
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
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No categories found.
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No categories match "{search}".
                      </td>
                    </tr>
                  ) : (
                    pageCategories.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color ? `#${c.color}` : '#397db9' }} />
                        </td>
                        <td className="px-4 py-2 text-text!">{c.name}</td>
                        <td className="px-4 py-2 text-text-faint">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredCategories.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
