import { Loader2, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'

// Shared loading/error states for the report pages that scrape real legacy
// pages client-side (Stocks, Stocks By Lot, Lots/Serials, Variant
// Attributes, Statistics) — same visual language as LedgerOverview.tsx's
// inline versions, factored out here since four pages share it verbatim.

export function LegacyLoadingCard({ label }: { label: string }) {
  return (
    <Card className="items-center justify-center gap-2 py-10 text-center">
      <Loader2 size={20} className="animate-spin text-brand" />
      <p className="text-sm text-text-faint">{label}</p>
    </Card>
  )
}

// "For sale" / "For purchase" status text shared by the Stocks and
// Stocks-By-Lot reports — badge-styled to match the ZRA/Lot status badges
// on the Product List page instead of plain text.
export function SaleStatusBadge({ value }: { value: string }) {
  if (!value) return <span className="text-text-faint">—</span>
  const isActive = /^for /i.test(value.trim())
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${isActive ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{value}</span>
  )
}

export function LegacyErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const isAuthIssue = message.toLowerCase().includes('signed in')
  return (
    <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
      <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger-fg">{title}</p>
        <p className="text-xs text-danger-fg/80 mt-0.5">{message}</p>
        <div className="flex items-center gap-3 mt-2">
          <button type="button" onClick={onRetry} className="text-xs font-medium text-danger-fg underline">
            Retry
          </button>
          {isAuthIssue && (
            <Link to={ROUTES.login} className="text-xs font-medium text-danger-fg underline">
              Go to login
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
