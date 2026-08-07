import { type ComponentType } from 'react'
import { CheckCircle2, RefreshCw, ReceiptText, FileText, Calculator, Percent, ShoppingCart, ListChecks, LayoutList } from 'lucide-react'
import { formatMoney } from '../../../utils/format'
import { useVsdcStatus, type ZraSummary, type ZraSyncDetailRow, type ZraSyncStat } from '../zra.queries'

const fmt = (n: number) => `ZMW ${formatMoney(n)}`

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface-alt border border-border rounded-xl p-4 ${className}`}>{children}</div>
}

const ICON_STYLES = {
  blue: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
  cyan: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400',
  violet: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400',
  rose: 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400',
  success: 'bg-success-bg text-success-fg',
} as const

function SyncStatCard({
  label,
  stat,
  icon: Icon,
  color,
  totalLabel = 'Total',
}: {
  label: string
  stat: ZraSyncStat
  icon: ComponentType<{ size?: number }>
  color: keyof typeof ICON_STYLES
  totalLabel?: string
}) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide truncate">{label}</p>
        <p className="text-sm font-semibold text-text! mt-2">
          {fmt(stat.succeededAmount)} <span className="text-success font-normal">✓ Succeeded</span>
        </p>
        <p className="text-sm font-semibold text-text!">
          {fmt(stat.unsyncedAmount)} <span className="text-text-faint font-normal">Unsynced</span>
        </p>
        <p className="text-xs text-success mt-2">
          {totalLabel}: {fmt(stat.totalAmount)}
        </p>
      </div>
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
    </Card>
  )
}

function PurchaseAmountCard({ amount }: { amount: number }) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide truncate">Purchase Amount</p>
        <p className="text-sm font-semibold text-text! mt-2">
          {fmt(amount)} <span className="text-success font-normal">✓ Complete</span>
        </p>
        <p className="text-xs text-success mt-2 flex items-center gap-1">
          <ShoppingCart size={12} /> Supplier Invoices
        </p>
      </div>
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.success}`}>
        <CheckCircle2 size={18} />
      </span>
    </Card>
  )
}

const STATUS_BADGE: Record<ZraSyncDetailRow['status'], { label: string; cls: string; symbol: string }> = {
  poor: { label: 'POOR', cls: 'bg-danger-bg text-danger-fg', symbol: '✗' },
  fair: { label: 'FAIR', cls: 'bg-warning-bg text-warning-fg', symbol: '⚠' },
  good: { label: 'GOOD', cls: 'bg-success-bg text-success-fg', symbol: '✓' },
  complete: { label: 'COMPLETE', cls: 'bg-success-bg text-success-fg', symbol: '✓' },
}

const dash = (n: number | null) => (n === null ? '-' : String(n))

// Years list matches zraindex.php's own generation exactly (current year
// down to current year - 5) — real /api/zra/summary/ already accepts a
// `year` param and filters by it, so this is a live filter, not decorative.
const CURRENT_YEAR = new Date().getFullYear()
const FILTER_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

function YearFilter({ value, onChange }: { value: number | null; onChange: (year: number | null) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      <span className="hidden @sm:inline">Filter by Year:</span>
      <select
        value={value ?? 'all'}
        onChange={(e) => onChange(e.target.value === 'all' ? null : Number(e.target.value))}
        className="text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <option value="all">All Years</option>
        {FILTER_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  )
}

// Ports zraindex.php's checkZRAApiStatus()/fetchZRAContent() (VSDC version
// banner, service time, pending-invoice count) and quicklinks_ajax.php's
// 'getzraresponse' action (branch sync status code/message) — real, live
// gateway checks, not derived from local DB data (see useVsdcStatus).
function VsdcStatusBar() {
  const { data, isFetching, dataUpdatedAt, refetch } = useVsdcStatus()

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 text-sm border-b border-border pb-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {data?.vsdc?.logoUrl && <img src={data.vsdc.logoUrl} alt="" className="h-20 w-auto shrink-0" />}
        <div className="min-w-0">
          {data?.vsdc?.title && <h4 className="font-semibold text-text! truncate">{data.vsdc.title}</h4>}
          {data?.vsdc?.serviceTime && <p className="text-text-muted text-xs truncate">{data.vsdc.serviceTime}</p>}
          {data?.vsdc?.pendingLine && <p className="text-text-muted text-xs truncate">{data.vsdc.pendingLine}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5">
          <span className="text-text-muted">ZRA Server Api Status :</span>
          {data === undefined ? (
            <span className="text-text-faint">Checking…</span>
          ) : data.apiOnline ? (
            <span className="flex items-center gap-1 text-success font-medium">
              <CheckCircle2 size={14} /> ZRA API Online
            </span>
          ) : (
            <span className="text-danger font-medium">❌ ZRA API Connection Failed</span>
          )}
        </span>
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-text-muted">ZRA Server Synchronization Status :</span>
          {data?.syncStatus ? (
            <span className="inline-flex items-center rounded-full bg-warning-bg text-warning-fg text-xs font-medium px-2.5 py-1">
              {data.syncStatus.code} - {data.syncStatus.message}
            </span>
          ) : (
            <span className="text-text-faint text-xs">{data === undefined ? 'Checking…' : 'Unavailable'}</span>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh ZRA Status"
            className="p-1 rounded-md text-brand hover:bg-surface-alt disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          {dataUpdatedAt > 0 && !isFetching && (
            <span className="text-success text-xs">
              ✓ Live data - Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()} ({data?.responseTimeMs}ms)
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

export function ZraOverview({
  summary,
  year,
  onYearChange,
}: {
  summary: ZraSummary
  year: number | null
  onYearChange: (year: number | null) => void
}) {
  return (
    <div className="space-y-4">
      <VsdcStatusBar />

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-text!">
          <LayoutList size={16} className="text-brand" /> ZRA Synchronization Overview
        </h3>
        <YearFilter value={year} onChange={onYearChange} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <SyncStatCard label="Sales Invoices" stat={summary.salesInvoices} icon={ReceiptText} color="blue" />
        <SyncStatCard label="Credit Notes" stat={summary.creditNotes} icon={FileText} color="cyan" />
        <SyncStatCard label="Income" stat={summary.income} icon={Calculator} color="violet" totalLabel="Combined Total" />
        <SyncStatCard label="VAT Amount" stat={summary.vatAmount} icon={Percent} color="rose" />
        <PurchaseAmountCard amount={summary.purchaseAmount.amount} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-text!">
          <ListChecks size={16} className="text-brand" /> ZRA Synchronization Details
        </h3>
        <YearFilter value={year} onChange={onYearChange} />
      </div>
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-3">Category</th>
              <th className="font-medium px-4 py-3">Total Count</th>
              <th className="font-medium px-4 py-3">Succeeded</th>
              <th className="font-medium px-4 py-3">Unsynced</th>
              <th className="font-medium px-4 py-3">Succeeded Amount</th>
              <th className="font-medium px-4 py-3">Unsynced Amount</th>
              <th className="font-medium px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.details.map((row) => {
              const badge = STATUS_BADGE[row.status]
              return (
                <tr key={row.category} className="border-t border-border">
                  <td className="px-4 py-3 text-brand font-medium">{row.category}</td>
                  <td className="px-4 py-3 text-text-muted">{dash(row.totalCount)}</td>
                  <td className="px-4 py-3 text-success font-medium">{dash(row.succeeded)}</td>
                  <td className="px-4 py-3 text-danger font-medium">{dash(row.unsynced)}</td>
                  <td className="px-4 py-3 text-success font-medium whitespace-nowrap">{row.succeededAmount === null ? '-' : fmt(row.succeededAmount)}</td>
                  <td className="px-4 py-3 text-danger font-medium whitespace-nowrap">{row.unsyncedAmount === null ? '-' : fmt(row.unsyncedAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.symbol} {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
