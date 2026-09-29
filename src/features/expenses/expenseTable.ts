import { useMemo, useState } from 'react'
import type { Tone } from './expenseTabsParser'

// The backend's own tables offer 10/20/50/100/500 rows a page and a search box.
export const PAGE_SIZES = [10, 20, 50, 100, 500]

export const controlCls = 'h-9 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

// The colour the backend gave a figure (an amount owed, a balance settled…).
export const TONE_CLS: Record<Tone, string> = {
  warning: 'text-warning-fg',
  info: 'text-info-fg',
  success: 'text-success-fg',
  danger: 'text-danger-fg',
  primary: 'text-brand',
  none: 'text-text!',
}

export interface DataTableOptions<T> {
  rows: T[]
  // Text the search box looks in.
  searchText: (row: T) => string
  // How each sortable column orders its rows.
  sortValue: (row: T, key: string) => string | number
  defaultSort: { key: string; dir: 'asc' | 'desc' }
}

// Search, sort and page rows that are already in memory — what the backend's own DataTables do for
// its Approvals and Payments tables (which are printed in full and paged in the browser).
export function useDataTable<T>({ rows, searchText, sortValue, defaultSort }: DataTableOptions<T>) {
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(20)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(defaultSort)

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const found = q ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows
    const copy = [...found].sort((a, b) => {
      const av = sortValue(a, sort.key)
      const bv = sortValue(b, sort.key)
      return typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    })
    return sort.dir === 'desc' ? copy.reverse() : copy
  }, [rows, search, sort, searchText, sortValue])

  const lastPage = Math.max(1, Math.ceil(sorted.length / perPage))
  const current = Math.min(page, lastPage)
  return {
    pageRows: sorted.slice((current - 1) * perPage, current * perPage),
    total: sorted.length,
    all: rows.length,
    search,
    setSearch: (v: string) => {
      setSearch(v)
      setPage(1)
    },
    perPage,
    setPerPage: (n: number) => {
      setPerPage(n)
      setPage(1)
    },
    page: current,
    setPage,
    sort,
    toggleSort: (key: string) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })),
  }
}
