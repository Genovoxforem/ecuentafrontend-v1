import { type ComponentType, type ReactNode } from 'react'
import { Calculator, CalendarDays, FileText, ListChecks, Package, Percent, ReceiptText, RefreshCw, ShoppingCart } from 'lucide-react'
import { formatMoney } from '../../../utils/format'
import { useZraManualSync } from '../zraActions.queries'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { useZraServerStatus, type ZraSummary, type ZraSyncDetailRow, type ZraSyncStat } from '../zra.queries'

// The backend prints a negative amount as "-ZMW 2,220.43".
const fmt = (n: number) => `${n < 0 ? '-' : ''}ZMW ${formatMoney(Math.abs(n))}`

// One accent per card, as on the backend dashboard: a coloured top edge, a
// matching label, and a tinted icon tile.
const ACCENTS = {
  blue: { edge: 'border-t-blue-500', label: 'text-blue-600 dark:text-blue-400', tile: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400', meta: 'text-blue-600 dark:text-blue-400' },
  cyan: { edge: 'border-t-cyan-500', label: 'text-cyan-600 dark:text-cyan-400', tile: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400', meta: 'text-cyan-600 dark:text-cyan-400' },
  violet: { edge: 'border-t-violet-500', label: 'text-violet-600 dark:text-violet-400', tile: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400', meta: 'text-violet-600 dark:text-violet-400' },
  amber: { edge: 'border-t-amber-500', label: 'text-amber-600 dark:text-amber-400', tile: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400', meta: 'text-amber-600 dark:text-amber-400' },
  green: { edge: 'border-t-emerald-500', label: 'text-emerald-600 dark:text-emerald-400', tile: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400', meta: 'text-emerald-600 dark:text-emerald-400' },
} as const
type Accent = keyof typeof ACCENTS

function StatCard({
  label,
  accent,
  icon: Icon,
  metaIcon: MetaIcon,
  meta,
  children,
}: {
  label: string
  accent: Accent
  icon: ComponentType<{ size?: number }>
  metaIcon: ComponentType<{ size?: number }>
  meta: string
  children: React.ReactNode
}) {
  const a = ACCENTS[accent]
  return (
    <div className={`relative flex flex-col rounded-xl border border-border border-t-2 ${a.edge} bg-surface-alt px-3 py-1.5 shadow-sm`}>
      <span className={`absolute right-3 top-2 grid h-7 w-7 place-items-center rounded-lg ${a.tile}`}>
        <Icon size={15} />
      </span>
      <p className={`pr-9 text-[11px] font-bold uppercase tracking-wide ${a.label}`}>{label}</p>
      <div className="mt-1 space-y-0.5">{children}</div>
      <p className={`mt-1 flex items-center gap-1.5 whitespace-nowrap border-t border-dashed border-border pt-1 text-[11px] font-semibold ${a.meta}`}>
        <MetaIcon size={11} /> {meta}
      </p>
    </div>
  )
}

function SyncStatCard({ label, stat, accent, icon, metaIcon, totalLabel = 'Total' }: { label: string; stat: ZraSyncStat; accent: Accent; icon: ComponentType<{ size?: number }>; metaIcon: ComponentType<{ size?: number }>; totalLabel?: string }) {
  return (
    <StatCard label={label} accent={accent} icon={icon} metaIcon={metaIcon} meta={`${totalLabel}: ${fmt(stat.totalAmount)}`}>
      <p className="flex items-baseline justify-between gap-1.5 whitespace-nowrap text-xs font-bold leading-5 text-text!">
        {fmt(stat.succeededAmount)} <span className="text-[10px] text-success">✓ Succeeded</span>
      </p>
      <p className="flex items-baseline justify-between gap-1.5 whitespace-nowrap text-xs font-bold leading-5 text-text!">
        {fmt(stat.unsyncedAmount)} <span className="text-[10px] font-semibold text-text-muted">Unsynced</span>
      </p>
    </StatCard>
  )
}

// The combined card is set apart on the backend page: the succeeded amount is
// the large green figure, the unsynced amount a lighter grey line.
function IncomeCard({ stat }: { stat: ZraSyncStat }) {
  return (
    <StatCard label="Income" accent="violet" icon={Calculator} metaIcon={Calculator} meta={`Combined: ${fmt(stat.totalAmount)}`}>
      <p className="flex items-baseline justify-between gap-1.5 whitespace-nowrap text-xs font-bold leading-5 text-success">
        {fmt(stat.succeededAmount)} <span className="text-[10px]">✓ Succeeded</span>
      </p>
      <p className="flex items-baseline justify-between gap-1.5 whitespace-nowrap text-xs font-bold leading-5 text-text!">
        {fmt(stat.unsyncedAmount)} <span className="text-[10px] font-semibold text-text-muted">Unsynced</span>
      </p>
    </StatCard>
  )
}

function PurchaseAmountCard({ amount }: { amount: number }) {
  return (
    <StatCard label="Purchase Amount" accent="green" icon={ShoppingCart} metaIcon={ShoppingCart} meta="Supplier Invoices">
      <p className="flex items-baseline justify-between gap-1.5 whitespace-nowrap text-xs font-bold leading-5 text-text!">
        {fmt(amount)} <span className="text-[10px] text-success">✓ Complete</span>
      </p>
    </StatCard>
  )
}

const STATUS_BADGE: Record<ZraSyncDetailRow['status'], { label: string; cls: string; symbol: string }> = {
  poor: { label: 'POOR', cls: 'bg-danger-bg text-danger-fg', symbol: '✗' },
  fair: { label: 'FAIR', cls: 'bg-warning-bg text-warning-fg', symbol: '⚠' },
  good: { label: 'GOOD', cls: 'bg-success-bg text-success-fg', symbol: '✓' },
  complete: { label: 'COMPLETE', cls: 'bg-success-bg text-success-fg', symbol: '✓' },
}

const ROW_ICONS: Record<string, { icon: ComponentType<{ size?: number }>; tile: string }> = {
  'Sales Invoices': { icon: ReceiptText, tile: ACCENTS.blue.tile },
  'Credit Notes': { icon: FileText, tile: ACCENTS.cyan.tile },
  'Stock Items': { icon: Package, tile: ACCENTS.amber.tile },
  'Purchase Amount': { icon: ShoppingCart, tile: ACCENTS.green.tile },
}

const dash = (n: number | null) => (n === null ? '-' : String(n))

// Years list matches zraindex.php's own generation exactly (current year
// down to current year - 5) — the summary endpoint takes a `year` param and
// filters by it, so this is a live filter, not decorative.
const CURRENT_YEAR = new Date().getFullYear()
const FILTER_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

function YearFilter({ value, onChange }: { value: number | null; onChange: (year: number | null) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
      <CalendarDays size={15} className="text-brand" />
      <span>Year:</span>
      <select
        value={value ?? 'all'}
        onChange={(e) => onChange(e.target.value === 'all' ? null : Number(e.target.value))}
        className="min-w-32 rounded-md border border-input-border bg-input-bg px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-text focus:outline-none focus:ring-2 focus:ring-brand/30"
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

// The dashboard's "Manual Sync": runs the full ZRA synchronization now
// (custom/zra/zra_run_sync.php) and reports how long it took.
function ManualSyncButton() {
  const sync = useZraManualSync()
  const confirm = useConfirm()

  const run = async () => {
    const ok = await confirm({
      title: 'Run the ZRA synchronization now?',
      message: 'This runs the full synchronization with the ZRA gateway and can take a while.',
      warningTitle: 'This talks to the live ZRA gateway.',
      warningMessage: 'Pending documents are exchanged with ZRA as part of the sync.',
      variant: 'default',
      confirmLabel: 'Run sync',
    })
    if (ok) sync.mutate()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={sync.isPending}
        title="Run full ZRA synchronization now"
        className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        <RefreshCw size={14} className={sync.isPending ? 'animate-spin' : ''} /> {sync.isPending ? 'Syncing…' : 'Manual Sync'}
      </button>
      {sync.isPending && <span className="text-xs text-text-faint">Running ZRA sync…</span>}
      {sync.isSuccess && <span className="text-xs font-medium text-success">✓ Sync completed ({sync.data.durationSec}s)</span>}
      {sync.isError && <span className="max-w-64 text-xs font-medium text-danger">{sync.error instanceof Error ? sync.error.message : 'Sync failed'}</span>}
    </div>
  )
}

// The dashboard's "ZRA Server Synchronization Status": the backend asks the ZRA
// gateway for the branch sync status (quicklinks_ajax.php, type=getzraresponse)
// and prints the answer, e.g. "000 - It is succeeded" or "901 - It is not valid
// device", with when it was checked. The refresh button asks again.
function ZraStatusBox() {
  const { data, isFetching, isError, error, dataUpdatedAt, refetch } = useZraServerStatus()

  const tone = data ? (data.ok ? 'border-success/40 bg-success-bg text-success-fg' : 'border-warning/40 bg-warning-bg text-warning-fg') : isError ? 'border-danger/40 bg-danger-bg text-danger-fg' : 'border-border bg-surface text-text-faint'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">ZRA Server Synchronization Status</p>
      <div className="flex items-center gap-2">
        <div className={`min-w-64 rounded-md border px-4 py-1.5 text-center text-sm font-medium leading-snug ${tone}`}>
          {data ? (
            <>
              {data.code ? `${data.code} - ` : ''}
              {data.message}
              {dataUpdatedAt > 0 && !isFetching && (
                <span className="block text-[11px] font-normal text-success">
                  ✓ Live data - Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()} ({data.responseTimeMs}ms)
                </span>
              )}
            </>
          ) : isError ? (
            <>❌ {error instanceof Error ? error.message : 'Connection failed'}</>
          ) : (
            'Checking…'
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh ZRA Status"
          className="grid h-9 w-9 place-items-center rounded-md border border-success/50 text-success hover:bg-success-bg disabled:opacity-50"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-alt px-5 py-4">{children}</div>
}

export function ZraOverview({
  summary,
  year,
  onYearChange,
  tabs,
}: {
  summary: ZraSummary
  year: number | null
  onYearChange: (year: number | null) => void
  tabs?: ReactNode
}) {
  return (
    <div className="space-y-5">
      {tabs && <div>{tabs}</div>}
      <InBanner>
        <ZraStatusBox />
        <YearFilter value={year} onChange={onYearChange} />
      </InBanner>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SyncStatCard label="Sales Invoices" stat={summary.salesInvoices} accent="blue" icon={ReceiptText} metaIcon={ReceiptText} />
        <SyncStatCard label="Credit Notes" stat={summary.creditNotes} accent="cyan" icon={FileText} metaIcon={FileText} />
        <IncomeCard stat={summary.income} />
        <SyncStatCard label="VAT Amount" stat={summary.vatAmount} accent="amber" icon={Percent} metaIcon={Percent} />
        <PurchaseAmountCard amount={summary.purchaseAmount.amount} />
      </div>

      <Banner>
        <h3 className="flex items-center gap-2.5 text-lg font-bold text-text!">
          <ListChecks size={20} className="text-brand" /> ZRA Synchronization Details
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <ManualSyncButton />
        </div>
      </Banner>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-alt">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-bold text-text">
              <th className="px-5 py-4 text-left">Category</th>
              <th className="px-5 py-4 text-center">Total Count</th>
              <th className="px-5 py-4 text-center">Succeeded</th>
              <th className="px-5 py-4 text-center">Unsynced</th>
              <th className="px-5 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.details.map((row) => {
              const badge = STATUS_BADGE[row.status]
              const rowIcon = ROW_ICONS[row.category]
              const RowIcon = rowIcon?.icon
              return (
                <tr key={row.category} className="border-t border-border">
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 font-semibold text-brand">
                      {RowIcon && (
                        <span className={`grid h-8 w-8 place-items-center rounded-md ${rowIcon.tile}`}>
                          <RowIcon size={15} />
                        </span>
                      )}
                      {row.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-semibold text-brand tabular-nums">{dash(row.totalCount)}</td>
                  <td className="px-5 py-4 text-center font-bold text-success tabular-nums">{dash(row.succeeded)}</td>
                  <td className="px-5 py-4 text-center font-bold text-danger tabular-nums">{dash(row.unsynced)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
                      {badge.symbol} {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
