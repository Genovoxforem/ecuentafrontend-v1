import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Skeleton } from '../../../shared/components/Skeleton'

// The classic page's tab bar (payroll_v2/index.php), same order and labels.
// A tab with no screen in this app yet shows greyed out instead of linking
// off to the classic page.
const PAYROLL_TABS: Array<{ label: string; path?: string; end?: boolean }> = [
  { label: 'Dashboard', path: ROUTES.payrollV2Dashboard, end: true },
  { label: 'Pay Runs', path: ROUTES.payrollV2PayRuns },
  { label: 'Templates', path: ROUTES.payrollV2Templates },
  { label: 'Shifts', path: ROUTES.payrollV2Shifts },
  { label: 'Employees', path: ROUTES.payrollV2Employees },
  { label: 'Attendance', path: ROUTES.payrollV2Attendance },
  { label: 'Leave', path: ROUTES.payrollV2Leave },
  { label: 'Advances/Loans', path: ROUTES.payrollV2Advances },
  { label: 'Reports', path: ROUTES.payrollV2Reports },
  { label: 'Analytics', path: ROUTES.payrollV2Analytics },
  { label: 'Settings', path: ROUTES.payrollV2Settings },
  { label: 'Setup', path: ROUTES.payrollV2Setup },
]

const tabCls = 'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide'

export function PayrollV2Tabs() {
  return (
    <nav aria-label="Payroll" className="no-scrollbar flex overflow-x-auto border-b border-border">
      {PAYROLL_TABS.map((tab) =>
        tab.path ? (
          <NavLink
            key={tab.label}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) => `${tabCls} ${isActive ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}
          >
            {tab.label}
          </NavLink>
        ) : (
          <span key={tab.label} title="Not available in this app yet" className={`${tabCls} cursor-not-allowed border-transparent text-text-faint/60`}>
            {tab.label}
          </span>
        ),
      )}
    </nav>
  )
}

// The badge the classic page prints for a pay run / request status.
const STATUS_TONES: Record<string, string> = {
  draft: 'bg-surface-hover text-text-muted',
  submitted: 'bg-info-bg text-info-fg',
  pending: 'bg-info-bg text-info-fg',
  approved: 'bg-success-bg text-success-fg',
  posted: 'bg-brand/15 text-brand',
  locked: 'bg-warning-bg text-warning-fg',
  rejected: 'bg-danger-bg text-danger-fg',
  present: 'bg-success-bg text-success-fg',
  absent: 'bg-danger-bg text-danger-fg',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? '').toLowerCase()
  if (!key) return <span className="text-text-faint">—</span>
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_TONES[key] ?? 'bg-surface-hover text-text-muted'}`}>{key}</span>
}

// A card with a title row, the shape every panel on these screens uses.
export function PanelCard({ title, action, children, className = '' }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`!h-auto !p-0 overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-text!">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

// A panel whose body is a full-width table: no padding, so the rows reach the card's edge.
// `fill`: the panel takes the rest of the page's height and its rows scroll
// inside it (pair with a sticky <thead>), so the page itself doesn't scroll.
export function TablePanel({ title, action, children, fill = false }: { title: ReactNode; action?: ReactNode; children: ReactNode; fill?: boolean }) {
  return (
    <Card className={`!p-0 overflow-hidden ${fill ? 'flex min-h-0 flex-1 flex-col' : '!h-auto'}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-text!">{title}</h3>
        {action}
      </div>
      <div className={fill ? 'min-h-0 flex-1 overflow-auto' : 'overflow-x-auto'}>{children}</div>
    </Card>
  )
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted ${className}`}>{children}</th>
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-text ${className}`}>{children}</td>
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-text-faint italic">
        {label}
      </td>
    </tr>
  )
}

export function LoadingRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-t border-border">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-2.5">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function ErrorCard({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="!h-auto flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-danger">Couldn't load this from Payroll.</p>
        <p className="mt-0.5 text-xs text-text-muted">{error instanceof Error ? error.message : 'Unknown error.'}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
          Try again
        </button>
      )}
    </Card>
  )
}

// A centred dialog over a dimmed page — the classic screens' pop-up forms.
export function PayrollModal({ title, onClose, children, width = 'max-w-lg' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text!">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
