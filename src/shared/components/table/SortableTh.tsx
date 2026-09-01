import { useMemo, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export type SortDir = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K | null
  dir: SortDir
}

// Generic client-side sort for a list page's already-loaded row array — every
// list page in this app fetches a page (or all) of real rows up front and
// filters/slices them in the browser, so sorting the same way (no extra
// backend round-trip, no per-endpoint sort-param wiring to verify) matches
// how these pages already work end-to-end.
export function useSortableRows<T, K extends string>(rows: T[], getValue: (row: T, key: K) => string | number) {
  const [sort, setSort] = useState<SortState<K>>({ key: null, dir: 'asc' })

  const sorted = useMemo(() => {
    if (!sort.key) return rows
    const key = sort.key
    const copy = [...rows].sort((a, b) => {
      const av = getValue(a, key)
      const bv = getValue(b, key)
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    })
    if (sort.dir === 'desc') copy.reverse()
    return copy
  }, [rows, sort, getValue])

  function toggleSort(key: K) {
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  return { sorted, sort, toggleSort }
}

// Bold, brand-colored header row shared by every list table app-wide — one
// consistent, identifiable look everywhere instead of each page's own faint
// gray header. Pair with <Th> cells inside it.
export function TheadRow({ children }: { children: ReactNode }) {
  return <tr className="bg-brand text-left text-xs text-white uppercase tracking-wide">{children}</tr>
}

// Header cell for TheadRow. Pass sortKey+sort+onSort to make a column
// clickable/sortable (shows an up/down/both-direction chevron); omit them for
// a purely-decorative header (e.g. an Actions column).
export function Th<K extends string>({
  children,
  sortKey,
  sort,
  onSort,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  sortKey?: K
  sort?: SortState<K>
  onSort?: (key: K) => void
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const sortable = sortKey !== undefined && onSort !== undefined
  const active = sortable && sort?.key === sortKey
  const justifyCls = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
  const textAlignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <th
      onClick={sortable ? () => onSort(sortKey as K) : undefined}
      className={`px-4 py-2.5 font-bold whitespace-nowrap select-none ${textAlignCls} ${sortable ? 'cursor-pointer hover:bg-brand-hover' : ''} ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${justifyCls}`}>
        {children}
        {sortable &&
          (active ? sort!.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} /> : <ChevronsUpDown size={13} className="opacity-60" />)}
      </span>
    </th>
  )
}
