import { useState, Fragment } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  FileText,
  Trash2,
  Landmark,
  CalendarClock,
  Scale,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ListCollapse,
  Rows3,
  Lock,
  Pencil,
  Wallet,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, fmtZMW, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../routes'
import { useLedgerReport, useDeleteLedgerEntry, defaultLedgerFilters, type LedgerFilters, type LedgerMovement } from '../generalLedger.queries'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { DocLink } from './DocLink'
import { LedgerToolbar, LedgerFilterBar, LedgerPagination } from './LedgerControls'

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

// Mirrors the legacy page's "◀ Year 2026 ▶" jump — reads the year straight
// off dateStart so it always reflects the currently-applied filters, not
// just the draft still being edited.
function yearOf(filters: LedgerFilters): number {
  return Number(filters.dateStart.slice(0, 4)) || new Date().getFullYear()
}

function YearStepper({ year, onJump }: { year: number; onJump: (year: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1">
      <button
        type="button"
        onClick={() => onJump(year - 1)}
        title="Previous year"
        aria-label="Previous year"
        className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-semibold text-text! px-1.5 whitespace-nowrap">Year {year}</span>
      <button
        type="button"
        onClick={() => onJump(year + 1)}
        title="Next year"
        aria-label="Next year"
        className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
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

const COLUMNS = ['Num.', 'Journal', 'Date', 'Accounting Doc.', 'Label', 'Currency', 'Conversion', 'Debit', 'Credit', 'Lettering Code', '']

// A link into this page (e.g. from Account Balance) can carry the account and date range to show.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
function filtersFromUrl(params: URLSearchParams): LedgerFilters {
  const base = defaultLedgerFilters()
  const start = params.get('dateStart') ?? ''
  const end = params.get('dateEnd') ?? ''
  return {
    ...base,
    accountCode: params.get('accountCode') ?? base.accountCode,
    dateStart: ISO_DATE.test(start) ? start : base.dateStart,
    dateEnd: ISO_DATE.test(end) ? end : base.dateEnd,
  }
}

// Whether the filter fields / Account Summary are shown — remembered per
// browser so a user who hides them to see more of the table keeps that.
function useRememberedToggle(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : stored === '1'
    } catch {
      return initial
    }
  })
  const toggle = () =>
    setValue((prev) => {
      try {
        localStorage.setItem(key, prev ? '0' : '1')
      } catch {}
      return !prev
    })
  return [value, toggle] as const
}

export function LedgerOverview() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<LedgerFilters>(() => filtersFromUrl(searchParams))
  const [draft, setDraft] = useState<LedgerFilters>(filters)
  const { data: report, isLoading, isFetching, isError, error, refetch } = useLedgerReport(filters)
  const deleteEntry = useDeleteLedgerEntry()
  const confirm = useConfirm()
  // Expanded by default, like the legacy page — every account's lines show;
  // a group can still be folded away to just its totals/balance.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showFilters, toggleFilters] = useRememberedToggle('ecuenta:ledger-dashboard:filters', true)
  const [showSummary, toggleSummary] = useRememberedToggle('ecuenta:ledger-dashboard:summary', true)
  const toggleGroup = (code: string) =>
    setCollapsed((prev) => {
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
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-3 text-lg font-bold text-text!">
            <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
              <FileText size={18} />
            </span>
            Operations - View By Accounting Account (Ledger)
          </h2>
          <InBanner>
            <YearStepper
              year={yearOf(filters)}
              onJump={(year) => {
                const next = { ...filters, dateStart: `${year}-01-01`, dateEnd: `${year}-12-31`, page: 0 }
                setDraft(next)
                setFilters(next)
              }}
            />
          </InBanner>
        </div>
        <LedgerToolbar active="account" />
        {showFilters && (
          <LedgerFilterBar
            singleLine
            draft={draft}
            onChange={setDraft}
            onSubmit={() => setFilters({ ...draft, page: 0 })}
            onClear={() => {
              const next = defaultLedgerFilters()
              setDraft(next)
              setFilters(next)
            }}
            submitting={isFetching}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-3 px-6 py-3">
        {isError && <ErrorState message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {isLoading && (
          <Card className="items-center justify-center gap-2 py-10 text-center">
            <Loader2 size={20} className="animate-spin text-brand" />
            <p className="text-sm text-text-faint">Loading real ledger data from the accounting backend…</p>
          </Card>
        )}

        {report && (
          <>
            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              {/* Always shown, so hidden filters can be brought back even when nothing matched. */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
                <p className="text-xs text-text-faint">
                  {report.groups.length > 0 &&
                    `${report.groups.length} account${report.groups.length === 1 ? '' : 's'} · click one to fold its transaction lines`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleFilters}
                    aria-pressed={showFilters}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <SlidersHorizontal size={12} /> {showFilters ? 'Hide filters' : 'Show filters'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleSummary}
                    aria-pressed={showSummary}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <Landmark size={12} /> {showSummary ? 'Hide summary' : 'Show summary'}
                  </button>
                  {report.groups.length > 0 && (
                    <>
                      <span className="mx-1 h-4 w-px bg-border" />
                      <button
                        type="button"
                        onClick={() => setCollapsed(new Set())}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                      >
                        <Rows3 size={12} /> Expand all
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollapsed(new Set(report.groups.map((g) => g.accountCode)))}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                      >
                        <ListCollapse size={12} /> Collapse all
                      </button>
                    </>
                  )}
                </div>
              </div>
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
                      const isOpen = !collapsed.has(group.accountCode)
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
                              {entry.transactionNum ? (
                                <Link to={ROUTES.ledgerPieceDetail.replace(':pieceNum', entry.transactionNum)} className="flex items-center gap-1 text-brand hover:underline">
                                  <FileText size={12} />
                                  {entry.transactionNum}
                                </Link>
                              ) : (
                                entry.transactionNum
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${journalBadgeColor(entry.journal)}`}>{entry.journal}</span>
                            </td>
                            <td className="px-3 py-2 text-text-muted whitespace-nowrap">{entry.date}</td>
                            <td className="px-3 py-2 text-text-muted">
                              <DocLink docType={entry.docType} fkDoc={entry.fkDoc} docUrl={entry.docUrl} label={entry.accountingDoc} />
                            </td>
                            <td className="px-3 py-2 text-text!">{entry.label}</td>
                            <td className="px-3 py-2 text-text-muted">{entry.currencyCode}</td>
                            <td className="px-3 py-2 text-text-faint text-xs">
                              {entry.conversionAmount || '-'}
                              {entry.exchangeRate && <div>Rate: {entry.exchangeRate}</div>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.debit > 0 ? fmtZMW(entry.debit) : '-'}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.credit > 0 ? fmtZMW(entry.credit) : '-'}</td>
                            <td className="px-3 py-2 text-text-faint text-xs">{entry.letteringCode || '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {entry.canEdit && entry.editUrl && entry.transactionNum && (
                                  <Link to={ROUTES.ledgerPieceDetail.replace(':pieceNum', entry.transactionNum)} title="View / edit this transaction" className="p-1 rounded text-text-faint hover:text-brand hover:bg-brand/10">
                                    <Pencil size={13} />
                                  </Link>
                                )}
                                {entry.canDelete && entry.deleteUrl && (
                                  <button
                                    type="button"
                                    disabled={deleteEntry.isPending}
                                    title="Delete this entry on the real accounting backend"
                                    onClick={async () => {
                                      if (entry.deleteUrl && (await confirm({ title: 'Delete Entry?', message: 'Delete this accounting entry on the real backend?' }))) deleteEntry.mutate(entry.deleteUrl)
                                    }}
                                    className="p-1 rounded text-text-faint hover:text-danger hover:bg-danger-bg disabled:opacity-40"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr key={`t-${group.accountCode}`} className="bg-surface-hover font-medium">
                          <td colSpan={COLUMNS.length - 4} className="px-3 py-1.5 text-right text-text-muted">
                            Total for account {group.accountCode}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text!">{fmtZMW(group.totalDebit)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text!">{fmtZMW(group.totalCredit)}</td>
                          <td colSpan={2}></td>
                        </tr>
                        <tr key={`b-${group.accountCode}`} className="bg-surface-hover/60">
                          <td colSpan={COLUMNS.length - 4} className="px-3 py-1.5 text-right text-text-muted">
                            Balance
                          </td>
                          <td colSpan={2} className={`px-3 py-1.5 text-right tabular-nums font-semibold ${group.balanceSide === 'Cr' ? 'text-danger' : 'text-success'}`}>
                            {fmtZMW(group.balance)} {group.balanceSide}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </Fragment>
                      )
                    })
                  )}
                </tbody>
                {report.groups.length > 0 && (
                  <tfoot>
                    <tr className="bg-brand/10 font-semibold">
                      <td colSpan={COLUMNS.length - 4} className="px-3 py-2 text-right text-text!">
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(report.grandTotalDebit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(report.grandTotalCredit)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {/* Below the last table row — only reached by scrolling to the end. */}
              <div className="space-y-3 p-3">
                {showSummary && (
                  <Card className="!h-auto">
                    <SectionHeading icon={Landmark}>Account Summary</SectionHeading>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {report.openingBalance && <MovementCard icon={Wallet} label="Opening Balance" movement={report.openingBalance} />}
                      {report.periodMovements && <MovementCard icon={CalendarClock} label="Period Movements (All Pages)" movement={report.periodMovements} />}
                      {report.closingBalance && <MovementCard icon={Scale} label="Closing Balance" movement={report.closingBalance} />}
                      {!report.openingBalance && !report.periodMovements && !report.closingBalance && (
                        <p className="text-xs text-text-faint py-2">Filter by a single account code to see its opening balance, period movements, and closing balance.</p>
                      )}
                    </div>
                  </Card>
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
            <LedgerPagination meta={report.meta} onPage={(page) => setFilters({ ...filters, page })} />
          </Card>

        </>
      )}

      </div>
    </div>
  )
}
