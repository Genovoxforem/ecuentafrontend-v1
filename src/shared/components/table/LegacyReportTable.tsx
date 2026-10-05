import { useDeferredValue, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'
import { TableExportButtons } from '../TableExportButtons'
import { ListPagination } from '../ListPagination'
import type { ReportTable } from '../../legacyReportTableParser'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Result table shared by the legacy "plain report" pages (Payroll, Fixed Asset) (Allowance/Deduction,
// NAPSA, NHIMA, Employer Contribution, Shift Timeline, Special/Holiday Shift
// Salary): export buttons, page-size select and search box like the legacy
// DataTable, with client-side filtering/pagination over the parsed rows.
export function LegacyReportTable({ title, table, hiddenColumns = [] }: { title: string; table: ReportTable; hiddenColumns?: string[] }) {
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)
  const deferred = useDeferredValue(search)

  const visible = useMemo(() => table.headers.map((h, i) => ({ h, i })).filter(({ h }) => !hiddenColumns.includes(h)), [table.headers, hiddenColumns])

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    if (!q) return table.rows
    return table.rows.filter((r) => r.some((c) => c.toLowerCase().includes(q)))
  }, [table.rows, deferred])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function getExportData() {
    return {
      headers: visible.map((v) => v.h),
      rows: filtered.map((r) => visible.map((v) => (r[v.i] ?? '').replace(/\n/g, ', '))),
    }
  }

  return (
    <>
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
        <TableExportButtons title={title} getExportData={getExportData} />
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
          className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm"
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search"
            className="h-9 w-full pl-8 pr-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              {visible.map(({ h, i }) => (
                <th key={i} className="font-medium px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(visible.length, 1)} className="px-3 py-8 text-center italic text-text-faint">
                  No data available in table
                </td>
              </tr>
            ) : (
              pageRows.map((r, ri) => {
                const isTotal = r.some((c) => /^Total\s*:/i.test(c))
                return (
                  <tr key={ri} className={`border-b border-border last:border-0 ${isTotal ? 'font-semibold' : ''}`}>
                    {visible.map(({ i }) => (
                      <td key={i} className="px-3 py-2 text-text-muted whitespace-pre-line">
                        {r[i] ?? ''}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

    </Card>
      <ListPagination page={safePage} perPage={pageSize} total={filtered.length} onPageChange={setPage} />
    </>
  )
}
