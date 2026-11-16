import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { Badge } from '../../fixedAsset/components/AssetUi'
import { STATUS_LABEL, STATUS_TONE } from '../installmentHelpers'

// Building blocks shared by the Installment Sales pages: the in-page tab strip of the classic pages, status badges, the progress meter and
// the loading / error cards. KPI tiles, banners, the segmented filter and the form dialog are the Fixed Asset ones (same classic look).

export type InstallmentNavKey = 'dashboard' | 'list' | 'new' | 'payments' | 'receipts' | 'reports' | 'settings'

const TABS: Array<[InstallmentNavKey, string, string]> = [
  ['dashboard', 'Dashboard', ROUTES.installmentDashboard],
  ['list', 'Installments', ROUTES.installmentList],
  ['new', '+ Create', ROUTES.installmentNew],
  ['payments', 'Payments', ROUTES.installmentPayments],
  ['receipts', 'Receipts', ROUTES.installmentReceipts],
  ['reports', 'Reports', ROUTES.installmentReports],
  ['settings', 'Settings', ROUTES.installmentSettings],
]

export function InstallmentSubNav({ active }: { active?: InstallmentNavKey }) {
  return (
    <nav aria-label="Installment sales" className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-alt p-1.5">
      <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">Installment sales</span>
      {TABS.map(([key, text, to]) => (
        <Link key={key} to={to} data-keep-visible aria-current={active === key ? 'page' : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active === key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}>
          {text}
        </Link>
      ))}
    </nav>
  )
}

export function StatusBadge({ status, extra }: { status: string; extra?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'}>
      {STATUS_LABEL[status] ?? status}
      {extra ? ` ${extra}` : ''}
    </Badge>
  )
}

export function Meter({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <div className="min-w-[88px]" title={`${p}% paid`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
        <div className="h-full rounded-full bg-success" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-0.5 text-[11px] text-text-muted">{p}%</div>
    </div>
  )
}

export const FILTER_INPUT = `${inputClasses} !w-auto`

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] font-medium text-text-faint">
      {label}
      {children}
    </label>
  )
}

export function QueryStates({ loading, error, onRetry, what }: { loading: boolean; error: unknown; onRetry: () => void; what: string }) {
  if (loading) return <LegacyLoadingCard label={`Loading ${what}…`} />
  if (error) return <LegacyErrorCard title={`Couldn't load ${what}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={onRetry} />
  return null
}
