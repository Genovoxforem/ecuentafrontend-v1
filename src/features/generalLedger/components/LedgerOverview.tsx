import { useState, Fragment, type FormEvent } from 'react'
import {
  FileText,
  Search,
  X as XIcon,
  Trash2,
  Landmark,
  CalendarClock,
  Scale,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  ListCollapse,
  Rows3,
  Lock,
} from 'lucide-react'
import { Card, fmtZMW, SectionHeading, TodayStatCard } from '../../../shared/components/dashboard/DashboardKit'
import { resolveBackendAsset } from '../../../api/backends'
import { ROUTES } from '../../../routes'
import { Link } from 'react-router-dom'
import { useLedgerReport, defaultLedgerFilters, type LedgerFilters, type LedgerMovement } from '../generalLedger.queries'

// Deterministic (hash-based, not row-index) so the same journal code always
// gets the same badge color across the whole table, not just within one
// group's rows.
const JOURNAL_BADGE_COLORS = [
  'bg-info-bg text-info-fg',
  'bg-success-bg text-success-fg',
  'bg-warning-bg text-warning-fg',
  'bg-brand/10 text-brand',
  'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400',
]

function journalBadgeColor(code: string): string {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  return JOURNAL_BADGE_COLORS[hash % JOURNAL_BADGE_COLORS.length]
}

function MovementCard({ icon: Icon, label, movement }: { icon: typeof CalendarClock; label: string; movement: LedgerMovement }) {
  const isCredit = movement.balanceSide === 'Cr'
  return (
    <div className="flex-1 min-w-56 rounded-lg border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2 mb-3">
        <span className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-brand/10 text-brand">
          <Icon size={15} />
        </span>
        <p className="text-sm font-semibold text-text!">{label}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted mb-2.5">
        <span>
          Debit: <span className="text-text! font-medium tabular-nums">{fmtZMW(movement.debit)}</span>
        </span>
        <span>
          Credit: <span className="text-text! font-medium tabular-nums">{fmtZMW(movement.credit)}</span>
        </span>
      </div>
      <div className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm font-semibold ${isCredit ? 'bg-danger-bg text-danger-fg' : 'bg-success-bg text-success-fg'}`}>
        <span>Balance</span>
        <span className="tabular-nums">
          {fmtZMW(movement.balance)} {movement.balanceSide}
        </span>
      </div>
    </div>
  )
}

function FiltersForm({
  draft,
  onChange,
  onSubmit,
  onClear,
  submitting,
}: {
  draft: LedgerFilters
  onChange: (next: LedgerFilters) => void
  onSubmit: () => void
  onClear: () => void
  submitting: boolean
}) {
  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      <label className="flex items-center gap-2 text-xs font-medium text-text-muted whitespace-nowrap">
        From
        <input
          type="date"
          value={draft.dateStart}
          onChange={(e) => onChange({ ...draft, dateStart: e.target.value })}
          className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-text-muted whitespace-nowrap">
        To
        <input
          type="date"
          value={draft.dateEnd}
          onChange={(e) => onChange({ ...draft, dateEnd: e.target.value })}
          className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-text-muted whitespace-nowrap">
        Account code
        <input
          type="text"
          placeholder="e.g. 401, 570..."
          value={draft.accountCode}
          onChange={(e) => onChange({ ...draft, accountCode: e.target.value })}
          className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 w-32"
        />
      </label>
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="submit"
          disabled={submitting}
          title="Search"
          aria-label="Search"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </button>
        <button
          type="button"
          onClick={onClear}
          title="Clear filters"
          aria-label="Clear filters"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-danger/10 text-danger hover:bg-danger/20"
        >
          <XIcon size={15} />
        </button>
      </div>
    </form>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthIssue = message.toLowerCase().includes('signed in')
  return (
    <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
      <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger-fg">Couldn't load the ledger</p>
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

const COLUMNS = ['Num.', 'Journal', 'Date', 'Accounting Doc.', 'Label', 'Currency', 'Conversion', 'Debit', 'Credit']

export function LedgerOverview() {
  const [filters, setFilters] = useState<LedgerFilters>(defaultLedgerFilters)
  const [draft, setDraft] = useState<LedgerFilters>(filters)
  const { data: report, isLoading, isFetching, isError, error, refetch } = useLedgerReport(filters)
  // Collapsed by default — the legacy page dumps every transaction line for
  // every account into one flat table (can run past 250 rows), which makes
  // it unscannable. Groups start closed so the account-level totals/balance
  // read as a summary first; expanding one reveals its line items.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleGroup = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  return (
    // -m-6 + flex-1 flex-col: same sticky-header pattern as OrdersList.tsx /
    // ThirdPartyList.tsx / StickyFormShell.tsx — the title+filters bar sticks
    // flush at main's true top, and the table Card fills the leftover height
    // with its own internal scroll instead of an arbitrary max-h box.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-3 text-lg font-bold text-text!">
          <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
            <FileText size={18} />
          </span>
          Operations - View By Accounting Account (Ledger)
        </h2>
        <FiltersForm
          draft={draft}
          onChange={setDraft}
          onSubmit={() => setFilters(draft)}
          onClear={() => {
            const next = defaultLedgerFilters()
            setDraft(next)
            setFilters(next)
          }}
          submitting={isFetching}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && <ErrorState message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {isLoading && (
          <Card className="items-center justify-center gap-2 py-10 text-center">
            <Loader2 size={20} className="animate-spin text-brand" />
            <p className="text-sm text-text-faint">Loading real ledger data from the accounting backend…</p>
          </Card>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <TodayStatCard label="Total Debit" value={fmtZMW(report.grandTotalDebit)} caption="All accounts in range" icon={ArrowDownCircle} color="rose" />
              <TodayStatCard label="Total Credit" value={fmtZMW(report.grandTotalCredit)} caption="All accounts in range" icon={ArrowUpCircle} color="green" />
              <TodayStatCard
                label="Net Balance"
                value={`${fmtZMW(Math.abs(report.grandTotalCredit - report.grandTotalDebit))} ${report.grandTotalCredit >= report.grandTotalDebit ? 'Cr' : 'Dr'}`}
                caption="Credit − Debit"
                icon={Scale}
                color={report.grandTotalCredit >= report.grandTotalDebit ? 'green' : 'rose'}
              />
              <TodayStatCard label="Accounts" value={String(report.groups.length)} caption="In this range" icon={Layers} color="indigo" />
            </div>

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              {report.groups.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
                  <p className="text-xs text-text-faint">
                    {report.groups.length} account{report.groups.length === 1 ? '' : 's'} · click one to see its transaction lines
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExpanded(new Set(report.groups.map((g) => g.accountCode)))}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <Rows3 size={12} /> Expand all
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(new Set())}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <ListCollapse size={12} /> Collapse all
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    {COLUMNS.map((col) => (
                      <th key={col} className={`font-medium px-3 py-2 whitespace-nowrap ${col === 'Debit' || col === 'Credit' ? 'text-right' : ''}`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.groups.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                        No accounting entries in this range.
                      </td>
                    </tr>
                  ) : (
                    report.groups.map((group) => {
                      const isOpen = expanded.has(group.accountCode)
                      return (
                      <Fragment key={group.accountCode}>
                        <tr className="bg-brand/5 cursor-pointer hover:bg-brand/10" onClick={() => toggleGroup(group.accountCode)}>
                          <td colSpan={COLUMNS.length} className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-2">
                              {isOpen ? <ChevronDown size={14} className="text-brand" /> : <ChevronRight size={14} className="text-brand" />}
                              <span className="inline-block px-2 py-0.5 rounded-md bg-brand text-white text-xs font-bold tabular-nums">{group.accountCode}</span>
                              <span className="font-semibold text-text!">{group.accountLabel}</span>
                              <span className="text-xs text-text-faint">
                                ({group.rows.length} line{group.rows.length === 1 ? '' : 's'})
                              </span>
                            </span>
                          </td>
                        </tr>
                        {isOpen && group.rows.map((entry, i) => (
                          <tr key={`${group.accountCode}-${entry.transactionNum}-${i}`} className="border-b border-border hover:bg-surface-hover">
                            <td className="px-3 py-2">
                              {entry.cardUrl ? (
                                <a
                                  href={resolveBackendAsset(entry.cardUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-brand hover:underline"
                                >
                                  <FileText size={12} />
                                  {entry.transactionNum}
                                  <ExternalLink size={10} className="text-text-faint" />
                                </a>
                              ) : (
                                entry.transactionNum
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${journalBadgeColor(entry.journal)}`}>{entry.journal}</span>
                            </td>
                            <td className="px-3 py-2 text-text-muted whitespace-nowrap">{entry.date}</td>
                            <td className="px-3 py-2 text-text-muted">{entry.accountingDoc || '-'}</td>
                            <td className="px-3 py-2 text-text!">{entry.label}</td>
                            <td className="px-3 py-2 text-text-muted">{entry.currencyCode}</td>
                            <td className="px-3 py-2 text-text-faint text-xs">
                              {entry.conversionAmount || '-'}
                              {entry.exchangeRate && <div>Rate: {entry.exchangeRate}</div>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.debit > 0 ? fmtZMW(entry.debit) : '-'}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.credit > 0 ? fmtZMW(entry.credit) : '-'}</td>
                          </tr>
                        ))}
                        <tr key={`t-${group.accountCode}`} className="bg-surface-hover font-medium">
                          <td colSpan={COLUMNS.length - 2} className="px-3 py-1.5 text-right text-text-muted">
                            Total for account {group.accountCode}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text!">{fmtZMW(group.totalDebit)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text!">{fmtZMW(group.totalCredit)}</td>
                        </tr>
                        <tr key={`b-${group.accountCode}`} className="bg-surface-hover/60">
                          <td colSpan={COLUMNS.length - 2} className="px-3 py-1.5 text-right text-text-muted">
                            Balance
                          </td>
                          <td colSpan={2} className={`px-3 py-1.5 text-right tabular-nums font-semibold ${group.balanceSide === 'Cr' ? 'text-danger' : 'text-success'}`}>
                            {fmtZMW(group.balance)} {group.balanceSide}
                          </td>
                        </tr>
                      </Fragment>
                      )
                    })
                  )}
                </tbody>
                {report.groups.length > 0 && (
                  <tfoot>
                    <tr className="bg-brand/10 font-semibold">
                      <td colSpan={COLUMNS.length - 2} className="px-3 py-2 text-right text-text!">
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(report.grandTotalDebit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(report.grandTotalCredit)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          <Card className="!h-auto">
            <SectionHeading icon={Landmark}>Account Summary</SectionHeading>
            <div className="mt-3 flex flex-wrap gap-3">
              {report.periodMovements && <MovementCard icon={CalendarClock} label="Period Movements" movement={report.periodMovements} />}
              {report.closingBalance && <MovementCard icon={Scale} label="Closing Balance" movement={report.closingBalance} />}
              {!report.periodMovements && !report.closingBalance && (
                <p className="text-xs text-text-faint py-2">Filter by a single account code to see its period movements and closing balance.</p>
              )}
            </div>
          </Card>
        </>
      )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            title="Deletes real accounting entries on the legacy backend — intentionally left disabled here"
            className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger opacity-80 cursor-not-allowed"
          >
            <Trash2 size={14} /> Delete Some Operation Lines From Accounting
          </button>
          <span className="flex items-center gap-1 text-xs text-text-faint">
            <Lock size={12} /> Disabled — this would modify real accounting entries
          </span>
        </div>
      </div>
    </div>
  )
}
