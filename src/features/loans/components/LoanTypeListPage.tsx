import { useMemo, useState } from 'react'
import { Tags, Search, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { DisabledFormModal } from '../../../shared/components/forms/DisabledFormModal'
import { useLoanTypesList, type LoanTypeRow } from '../loans.queries'
import { formatDate } from '../../../utils/format'

type SortKey = 'name' | 'color' | 'created'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Name', key: 'name' },
  { label: 'Color', key: 'color' },
  { label: 'Created', key: 'created' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(t: LoanTypeRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return t.name
    case 'color':
      return t.color
    case 'created':
      return t.createdAt ? new Date(t.createdAt).getTime() : 0
  }
}

function matchesSearch(t: LoanTypeRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return t.name.toLowerCase().includes(q)
}

// Real via categories/tag-sidebarlist-ajax.php?type_id=23 — the real "Loan
// Type" menu leaf points at categories/loans.php, Dolibarr's generic
// category system (type='loans' => 23, confirmed in
// categories/class/categorie.class.php), the very same one loan_product.php
// itself queries (`SELECT * FROM llx_categorie WHERE type = 23`) for its own
// Loan Type dropdown. Mirrors AgendaCategoriesPage.tsx/TagsList.tsx's exact
// pattern for the same real endpoint family, just for the Loans type.
export function LoanTypeListPage() {
  const { data: types, isLoading, isError, error } = useLoanTypesList()
  const [showAddType, setShowAddType] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => (types ?? []).filter((t) => matchesSearch(t, search)), [types, search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<LoanTypeRow, SortKey>(filteredRows, sortValue)
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tags size={20} className="text-brand" /> Loan Type
        </h2>
        <button type="button" onClick={() => setShowAddType(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add Tag
        </button>
      </div>

      {showAddType && (
        <DisabledFormModal
          icon={Tags}
          title="Add Tag"
          sourcePath="categories/card.php?action=create&type=23"
          fields={[
            { label: 'Label', required: true },
            { label: 'Color', type: 'text' },
            { label: 'Parent Category', type: 'select' },
            { label: 'Description', type: 'textarea' },
          ]}
          onClose={() => setShowAddType(false)}
        />
      )}

      {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : "Couldn't load loan types."}</Card>}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select value={perPage} onChange={(e) => handlePerPageChange(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
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
          <TableExportButtons title="Loan Type" getExportData={getExportData} />
        </div>
        <div className="overflow-auto">
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
              ) : !types || types.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No loan types match &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                pageRows.map((t) => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="px-4 py-3 text-text!">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-text-muted">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color ? `#${t.color}` : '#397db9' }} />
                        {t.color ? `#${t.color}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{t.createdAt ? formatDate(t.createdAt) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} />
    </div>
  )
}
