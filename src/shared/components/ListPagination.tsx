import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

// DataTables-style windowed page list: first page, a run of consecutive
// pages around the current one, "...", last page — e.g. 1 2 3 4 5 … 114.
export function getPageNumbers(current: number, total: number, windowSize = 5): (number | '…')[] {
  if (total <= windowSize + 2) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  let start = Math.max(1, current - Math.floor(windowSize / 2))
  let end = start + windowSize - 1
  if (end > total) {
    end = total
    start = end - windowSize + 1
  }
  const pages: (number | '…')[] = []
  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('…')
  }
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total) {
    if (end < total - 1) pages.push('…')
    pages.push(total)
  }
  return pages
}

// Renders as a sibling AFTER a list's scrollable table container (never
// nested inside it), so `sticky` sticks correctly to AppShell's <main> —
// nesting it inside an overflow-auto/max-h wrapper stops the stickiness from
// working, since it'd stick to that wrapper's own bounds instead (which end
// exactly where the table ends).
export function ListPagination({
  page,
  perPage,
  total,
  onPageChange,
  edgeToEdge = false,
}: {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  // Set when the parent page already bleeds edge-to-edge via its own -m-6 wrapper (see
  // ThirdPartyList.tsx) — skips this component's own -mx-3 bleed so it doesn't double up,
  // using px-6 (matching AppShell main's own p-6) for internal padding instead of px-3.
  edgeToEdge?: boolean
}) {
  if (total === 0) return null
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const rangeStart = (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, total)
  const pages = getPageNumbers(page, totalPages)

  const navBtnCls = 'p-1.5 rounded-md hover:bg-surface-alt disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    // -bottom-6 (not bottom-0): position:sticky's offset is always measured from main's own
    // PADDING edge (24px inset, AppShell's p-6), not main's true bottom edge — confirmed on
    // the create-form pages (see StickyFormShell.tsx), where bottom-0 left a 24px gap under
    // the footer whenever the list was shorter than the viewport. -24px shifts the stick
    // point by exactly that inset so it clamps flush against main's true bottom instead.
    <div
      className={`sticky -bottom-6 py-3 border-t border-border bg-white dark:bg-gray-950 flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted ${
        edgeToEdge ? 'px-6' : '-mx-3 px-3'
      }`}
    >
      <span>
        Showing {rangeStart} to {rangeEnd} of {total.toLocaleString()} entries
      </span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} className={navBtnCls} title="First page">
          <ChevronsLeft size={16} />
        </button>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className={navBtnCls} title="Previous page">
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-text-faint select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] px-2 py-1 rounded-md text-sm ${p === page ? 'bg-brand text-white font-semibold' : 'text-text hover:bg-surface-alt'}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} className={navBtnCls} title="Next page">
          <ChevronRight size={16} />
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} className={navBtnCls} title="Last page">
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}
