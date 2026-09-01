import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

export const PER_PAGE = 25

// Promoted to src/shared/components/ListPagination.tsx so every list page
// (not just ZRA's) can use the same real, sticky, functional pagination
// instead of each hand-rolling its own static/non-sticky footer.
export { ListPagination } from '../../../shared/components/ListPagination'

// Upload/sync actions across the ZRA module submit to the LIVE ZRA government
// tax sandbox (see custom/zra/core/modules/zraworker.class.php), not just a
// local mutation. Left unwired pending explicit confirmation that live
// submission is wanted, rather than silently faking success or silently
// firing real government-facing requests.
export function notWiredYet() {
  window.alert(
    'This action submits to the live ZRA government tax API and has not been wired up yet — confirm with the developer before enabling it.',
  )
}

export function ListHeader({ icon, title, count, action }: { icon: React.ReactNode; title: string; count: number | undefined; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
        {icon}
        {title}
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-alt text-text-muted">{count ?? '…'}</span>
      </h2>
      {action}
    </div>
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
        className="flex-1 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
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
