import type { ReactNode } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useDataTable } from '../expenseTable'
import { PerPageSelect, SearchBox, SortTh } from './expenseParts'

export interface ExpenseColumn<T> {
  key: string
  header: string
  align?: 'right' | 'center'
  // How the column orders its rows; without it the column is not sortable.
  sortValue?: (row: T) => string | number
  cell: (row: T) => ReactNode
}

const ALIGN = { right: 'text-right', center: 'text-center' }

// The backend's own table for a tab that prints all its rows: search, sort, rows per page, paging in the browser.
export function ExpenseTable<T>({
  rows,
  columns,
  rowKey,
  searchPlaceholder,
  searchText,
  defaultSort,
  empty = 'No records.',
}: {
  rows: T[]
  columns: ExpenseColumn<T>[]
  rowKey: (row: T) => string
  searchPlaceholder: string
  searchText: (row: T) => string
  defaultSort: { key: string; dir: 'asc' | 'desc' }
  empty?: string
}) {
  const t = useDataTable({ rows, searchText, sortValue: (row, key) => columns.find((c) => c.key === key)?.sortValue?.(row) ?? '', defaultSort })
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <PerPageSelect value={t.perPage} onChange={t.setPerPage} />
        <SearchBox value={t.search} onChange={t.setSearch} placeholder={searchPlaceholder} />
      </div>
      <Card className="!h-auto !p-0 overflow-hidden flex-1 min-h-0">
        <div className="h-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {columns.map((c) =>
                  c.sortValue ? (
                    <SortTh key={c.key} active={t.sort.key === c.key} dir={t.sort.dir} onSort={() => t.toggleSort(c.key)} align={c.align}>
                      {c.header}
                    </SortTh>
                  ) : (
                    <th key={c.key} className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold ${c.align ? ALIGN[c.align] : 'text-left'}`}>
                      {c.header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {t.pageRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center italic text-text-faint">
                    {t.all === 0 ? empty : 'No matching records found'}
                  </td>
                </tr>
              )}
              {t.pageRows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-border last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 ${c.align ? ALIGN[c.align] : ''}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={t.page} perPage={t.perPage} total={t.total} onPageChange={t.setPage} />
    </div>
  )
}
