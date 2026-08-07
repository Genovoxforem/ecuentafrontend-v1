import { AlertTriangle } from 'lucide-react'

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

export function EmptyRow({
  colSpan,
  isLoading,
  isError,
  isEmpty,
  emptyLabel,
}: {
  colSpan: number
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  emptyLabel: string
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

// Shown on ZRA pages with no matching backend endpoint at all (as opposed to
// a page that loaded and came back empty) — an honest "not available" state
// instead of fabricated rows.
export function BackendUnavailable({ icon, title, note }: { icon: React.ReactNode; title: string; note?: string }) {
  return (
    <div className="space-y-4">
      <ListHeader icon={icon} title={title} count={undefined} />
      <div className="rounded-xl border border-border bg-surface-alt px-4 py-10 flex flex-col items-center text-center gap-2">
        <AlertTriangle size={22} className="text-warning-fg" />
        <p className="text-sm font-medium text-text!">Backend not available yet</p>
        <p className="text-sm text-text-faint max-w-md">
          {note ?? 'No matching REST endpoint exists for this data on the backend yet — this page will connect once one is built.'}
        </p>
      </div>
    </div>
  )
}

export function ZraStatusBadge({ synced, label }: { synced: boolean; label: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${synced ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{label}</span>
  )
}
