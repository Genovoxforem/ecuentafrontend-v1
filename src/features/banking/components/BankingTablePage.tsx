import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'

export interface BankingColumn<T> {
  label: string
  text: (row: T) => string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
}

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// One list page for the banking tables that come whole from a single fapi answer (direct debit lines / requests / rejects, Stripe): search,
// page size, sorting, the CSV / Excel / Print / PDF buttons and the page bar, like the other banking lists.
export function BankingTablePage<T>({
  title,
  note,
  icon: Icon,
  columns,
  rows,
  isLoading,
  error,
  onRetry,
  rowKey,
  emptyText,
}: {
  title: string
  note?: string
  icon: ComponentType<{ size?: number; className?: string }>
  columns: BankingColumn<T>[]
  rows: T[] | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
  rowKey: (row: T) => string | number
  emptyText: string
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rows ?? []).filter((r) => !q || columns.some((c) => c.text(r).toLowerCase().includes(q)))
  }, [rows, search, columns])
  const getValue = useMemo(() => (row: T, key: string) => columns[Number(key)].text(row), [columns])
  const { sorted, sort, toggleSort } = useSortableRows<T, string>(filtered, getValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
          {note && <span className="text-sm font-normal text-text-muted">{note}</span>}
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />}
        {!isLoading && error != null && <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={onRetry} />}

        {rows && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
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
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                />
              </div>
              <TableExportButtons title={title} getExportData={() => ({ headers: columns.map((c) => c.label), rows: sorted.map((r) => columns.map((c) => c.text(r))) })} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    {columns.map((c, i) => (
                      <Th key={c.label} sortKey={String(i)} sort={sort} onSort={toggleSort} align={c.align}>
                        {c.label}
                      </Th>
                    ))}
                  </TheadRow>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-4 text-text-faint italic">
                        {emptyText}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-4 text-text-faint italic">
                        No rows match "{search}".
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => (
                      <tr key={rowKey(r)} className="border-b border-border last:border-0">
                        {columns.map((c) => (
                          <td key={c.label} className={`px-4 py-2 ${c.align === 'right' ? 'text-right' : ''} text-text-muted`}>
                            {c.render ? c.render(r) : c.text(r)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
