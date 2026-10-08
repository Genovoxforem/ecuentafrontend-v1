import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Search } from 'lucide-react'
import { StickyListLayout, ScrollCard, STICKY_THEAD, STICKY_TFOOT } from '../../../shared/components/layout/StickyListLayout'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useLegacyList } from '../legacyList.queries'
import type { LegacyCell, LegacyTable } from '../legacyTable'

const inputCls = 'h-8 w-full min-w-20 px-2 rounded-md border border-input-border bg-input-bg text-text text-xs outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'
const NUMERIC = /^-?[\d,]+(\.\d+)?%?$/

// A real backend list page, rendered natively: the rows, headers, filter row
// and totals all come from the page itself (legacyTable.ts). Links are only
// drawn when `linkFor` maps a cell to a React route — never to a backend page.
export function LegacyListPage({
  icon: Icon,
  title,
  path,
  firstHeader,
  hasHeader,
  fixedParams,
  addTo,
  linkFor,
  emptyText = 'No record found.',
  toolbar,
  noFilters,
  rowSelect,
  searchable,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  path: string
  firstHeader: RegExp
  // pins the table when firstHeader is empty (a leading selection-checkbox column)
  hasHeader?: RegExp
  fixedParams?: Record<string, string>
  addTo?: { label: string; to: string }
  // `row` is the whole row, for links built from another cell (e.g. an account code). A returned
  // object can also colour the link.
  linkFor?: (header: string, cell: LegacyCell, row: LegacyCell[]) => string | { to: string; className?: string } | null
  emptyText?: string
  toolbar?: ReactNode | ((table: LegacyTable) => ReactNode)
  // the backend's filter block is not laid out per column on this page
  noFilters?: boolean
  // Rows whose first cell holds a selection checkbox (checkId) can be ticked; the
  // ticked ids live in the caller so its toolbar buttons can act on them.
  rowSelect?: { selected: Set<string>; onChange: (next: Set<string>) => void }
  // A search box that filters the rows on screen, and a "Showing … entries" line under the table.
  searchable?: boolean
}) {
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const { data, isLoading, isFetching, isError, error, refetch } = useLegacyList(
    path,
    firstHeader,
    {
      ...fixedParams,
      ...filters,
      limit: String(limit),
      page: String(page),
    },
    hasHeader,
  )

  if (isLoading) return <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />
  if (isError || !data) return <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const hasFilters = !noFilters && data.filters.some(Boolean)
  const needle = query.trim().toLowerCase()
  const rows = needle ? data.rows.filter((r) => r.some((c) => c.text.toLowerCase().includes(needle))) : data.rows
  const clearSelection = () => rowSelect?.onChange(new Set())
  const goToPage = (p: number) => {
    clearSelection()
    setPage(p)
  }
  const apply = (f: Record<string, string>) => {
    clearSelection()
    setFilters(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')))
    setPage(0)
  }
  const pageIds = rowSelect ? data.rows.map((r) => r[0]?.checkId).filter((id): id is string => !!id) : []
  const allTicked = !!rowSelect && pageIds.length > 0 && pageIds.every((id) => rowSelect.selected.has(id))
  const toggleId = (id: string) => {
    if (!rowSelect) return
    const next = new Set(rowSelect.selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    rowSelect.onChange(next)
  }
  const draftValue = (name: string, fallback: string) => draft[name] ?? filters[name] ?? fallback

  const renderCell = (header: string, cell: LegacyCell, row: LegacyCell[]): ReactNode => {
    const link = linkFor?.(header, cell, row) ?? null
    if (link) {
      const { to, className } = typeof link === 'string' ? { to: link, className: undefined } : link
      return (
        <Link to={to} className={`${className ?? 'text-brand'} hover:underline`}>
          {cell.text}
        </Link>
      )
    }
    return cell.text
  }
  // A column whose values are all numbers is right-aligned, header included, so they line up.
  const numericColumn = (i: number) => data.rows.length > 0 && data.rows.every((r) => NUMERIC.test(r[i]?.text ?? ''))

  return (
    <StickyListLayout
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Icon size={20} className="text-brand" /> {title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search" className={`${selectCls} w-56 pl-8`} />
              </div>
            )}
            {typeof toolbar === 'function' ? toolbar(data) : toolbar}
            {addTo && (
              <Link to={addTo.to} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                <Plus size={14} /> {addTo.label}
              </Link>
            )}
          </div>
        </div>
      }
    >
      <ScrollCard className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            apply({ ...filters, ...draft })
          }}
        >
          <table className="w-full text-sm">
            <thead className={STICKY_THEAD}>
              <tr className="border-b border-border bg-surface">
                {data.headers.map((h, i) => (
                  <th key={i} className={numericColumn(i) ? th.replace('text-left', 'text-right') : th}>
                    {i === 0 && rowSelect && pageIds.length > 0 && (
                      <input type="checkbox" checked={allTicked} onChange={() => rowSelect.onChange(allTicked ? new Set() : new Set(pageIds))} aria-label="Select all" className="mr-2 align-middle" />
                    )}
                    {h}
                  </th>
                ))}
              </tr>
              {hasFilters && (
                <tr className="border-b border-border">
                  {data.filters.map((f, i) => (
                    <th key={i} className="px-2 py-1.5 font-normal">
                      {f?.kind === 'text' && (
                        <input
                          value={draftValue(f.name, f.value)}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                          className={inputCls}
                          aria-label={`Filter ${data.headers[i]}`}
                        />
                      )}
                      {f?.kind === 'select' && (
                        <select
                          value={draftValue(f.name, f.value)}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                          className={inputCls}
                          aria-label={`Filter ${data.headers[i]}`}
                        >
                          {f.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {i === data.filters.length - 1 && !f && (
                        <span className="flex items-center gap-1">
                          <button type="submit" title="Search" className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-muted hover:text-brand">
                            <Search size={14} />
                          </button>
                          <button
                            type="button"
                            title="Remove filters"
                            onClick={() => {
                              setDraft({})
                              apply({})
                            }}
                            className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-muted hover:text-brand"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={data.headers.length} className="px-3 py-8 text-center italic text-text-faint">
                    {emptyText}
                  </td>
                </tr>
              )}
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border align-middle">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-3 py-3 ${NUMERIC.test(cell.text) ? 'text-right tabular-nums' : ''}`}>
                      {ci === 0 && rowSelect && cell.checkId && (
                        <input
                          type="checkbox"
                          checked={rowSelect.selected.has(cell.checkId)}
                          onChange={() => toggleId(cell.checkId!)}
                          aria-label={`Select ${cell.text}`}
                          className="mr-2 align-middle"
                        />
                      )}
                      {renderCell(data.headers[ci] ?? '', cell, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {data.totals.length > 0 && (
              <tfoot className={STICKY_TFOOT}>
                {data.totals.map((row, ri) => (
                  <tr key={`t${ri}`} className="border-t border-border font-semibold">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-3 py-3 ${NUMERIC.test(cell.text) ? 'text-right tabular-nums' : ''}`}>
                        {cell.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </form>
      </ScrollCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Some backend pages ignore `limit` and print every row; no pager then. */}
          {data.rows.length <= limit && (
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                clearSelection()
                setPage(0)
              }}
              className={selectCls}
              title="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
          {searchable && (
            <p className="text-sm text-text-muted">
              Showing {rows.length === 0 ? 0 : 1} to {rows.length} of {rows.length} entries{needle && rows.length !== data.rows.length ? ` (filtered from ${data.rows.length})` : ''}
            </p>
          )}
        </div>
        {data.rows.length <= limit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => goToPage(page - 1)}
              className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{page + 1}</span>
            <button
              type="button"
              disabled={data.rows.length < limit}
              onClick={() => goToPage(page + 1)}
              className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </StickyListLayout>
  )
}
