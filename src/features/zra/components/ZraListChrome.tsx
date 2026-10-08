import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

export const PER_PAGE = 25

// Promoted to src/shared/components/ListPagination.tsx so every list page
// (not just ZRA's) can use the same real, sticky, functional pagination
// instead of each hand-rolling its own static/non-sticky footer.
export { ListPagination } from '../../../shared/components/ListPagination'

// Just the live count, as a small inline badge meant to sit in the same row
// as the page's filter controls — not its own title line. The page's name
// already shows once, in the banner; repeating it here as a second <h2> only
// duplicated it (and the banner's own wording for a route rarely matches this
// component's title string exactly, so the two never even displayed the same
// duplicated text when they differed).
export function ListHeader({ icon, count }: { icon: React.ReactNode; count: number | undefined }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-text-muted shrink-0">
      {icon}
      <span className="font-semibold text-text!">{count ?? '…'}</span> items
    </span>
  )
}

export function SearchBox({ value, onChange, onSubmit, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder?: string }) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button type="button" onClick={onSubmit} className="px-3 h-9 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90">
        Search
      </button>
    </div>
  )
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface-alt overflow-auto max-h-[65vh] soft-scrollbar">{children}</div>
}

// `error` and `feature` back the api/zra/* "not available on this backend
// yet" state (see shared/components/BackendUnavailable.tsx): every ZRA list
// endpoint 404s on the current backend, so isError alone isn't enough to
// tell a genuine failure apart from that specific, honest case.
export function EmptyRow({
  colSpan,
  isLoading,
  isError,
  error,
  isEmpty,
  emptyLabel,
  feature,
}: {
  colSpan: number
  isLoading: boolean
  isError: boolean
  error?: unknown
  isEmpty: boolean
  emptyLabel: string
  feature: string
}) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-3 py-8 text-center text-text-faint">
          Loading…
        </td>
      </tr>
    )
  }
  if (isError) {
    if (isBackendUnavailable(error)) {
      return (
        <tr>
          <td colSpan={colSpan} className="p-0">
            <BackendUnavailableInline feature={feature} />
          </td>
        </tr>
      )
    }
    return (
      <tr>
        <td colSpan={colSpan} className="px-3 py-8 text-center text-danger">
          Could not load data.
        </td>
      </tr>
    )
  }
  if (!isEmpty) return null
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-text-faint">
        {emptyLabel}
      </td>
    </tr>
  )
}

export function ZraStatusBadge({ synced, label }: { synced: boolean; label: string }) {
  if (!label) return <span className="text-text-faint">-</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${synced ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{label}</span>
  )
}
