import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Info, Plus, Search } from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'
import { ListPagination } from '../ListPagination'
import { TableExportButtons } from '../TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../table/SortableTh'

export interface PayrollListColumn<T, K extends string> {
  key: K
  label: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  exportValue?: (row: T) => string
}

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Shared chrome for the Payroll "X List" pages — title/icon, "+ Add X"
// button, page-size + search + export toolbar, a sortable table, and
// pagination. All 10 non-Leave Human Resource list pages (Holiday, Award,
// Transfer, Resignation, Travel, Complaint, Warning, Termination, Indicator,
// Appraisal) share this exact shape and differ only in columns/data — same
// situation ThirdPartyList.tsx already solves for Customers/Prospects/Vendors.
export function PayrollRecordList<T, K extends string>({
  icon: Icon,
  title,
  addLabel,
  addPath,
  columns,
  rows,
  getRowKey,
  getSearchText,
  exportTitle,
  localOnlyNote,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  addLabel: string
  addPath: string
  columns: PayrollListColumn<T, K>[]
  rows: T[]
  getRowKey: (row: T) => string
  getSearchText: (row: T) => string
  exportTitle: string
  // Shown as an honest banner: this list only reflects records created in
  // this browser session (see payrollLists.queries.ts) — there's no read
  // API for these entities, so it can't show anything already on the
  // backend. Omit for entities where the create side is itself inert
  // (Indicator/Appraisal), where the banner would be misleading noise.
  localOnlyNote?: boolean
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => getSearchText(r).toLowerCase().includes(q))
  }, [rows, search, getSearchText])

  const sortValueByKey = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c.sortValue]))
    return (row: T, key: K) => map.get(key)?.(row) ?? ''
  }, [columns])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<T, K>(filteredRows, sortValueByKey)
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
    return {
      headers: columns.map((c) => c.label),
      rows: sortedRows.map((r) => columns.map((c) => c.exportValue?.(r) ?? '')),
    }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as LeaveList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
        </h2>
        <Link to={addPath} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> {addLabel}
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {localOnlyNote && (
          <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
            <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
            <p className="text-xs text-info-fg">
              There's no read API for this data on the legacy backend, so this list only shows records created here in this browser session — it won't
              include anything already saved on the backend, and resets on reload.
            </p>
          </Card>
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
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title={exportTitle} getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {columns.map((col) => (
                    <Th key={col.key} sortKey={col.sortValue ? col.key : undefined} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={columns.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={columns.length}>
                      No records match your search.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={getRowKey(r)} className="border-b border-border hover:bg-surface-hover/60">
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                        >
                          {col.render(r)}
                        </td>
                      ))}
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
