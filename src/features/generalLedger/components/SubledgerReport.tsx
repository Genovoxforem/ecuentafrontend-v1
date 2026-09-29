import { useState, Fragment } from 'react'
import { ListTree, FileText, Loader2, AlertTriangle, ChevronDown, ChevronRight, Rows3, ListCollapse, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { useSubledgerReport, useDeleteLedgerEntry, defaultLedgerFilters, type LedgerFilters } from '../generalLedger.queries'
import { LedgerToolbar, LedgerFilterBar, LedgerPagination } from './LedgerControls'
import { DocLink } from './DocLink'

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthIssue = /signed in|forbidden|403/i.test(message)
  return (
    <Card className="!h-auto !bg-danger-bg border-danger/40 flex items-start gap-3">
      <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger-fg">Couldn't load the subledger</p>
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

// Real columns confirmed live from listbysubaccount.php's own <th> row:
// Num. transaction / Journal / Date / Accounting Doc. / Label / Debit /
// Credit / Date export — a genuinely different template from the Ledger
// view's real page (Currency/Conversion/Lettering code, no Date export).
const COLUMNS = ['Num.', 'Journal', 'Date', 'Accounting Doc.', 'Label', 'Debit', 'Credit', 'Date Export', '']

// accountancy/bookkeeping/listbysubaccount.php — the real page has no JSON
// API and no working subledger filter param server-side (confirmed by
// reading it directly), but the one real JSON endpoint this module does
// have (listbyaccount_ajax_api.php, already powering Ledger/Journals)
// already returns a real subledger_account field on every entry — so this
// groups those same already-fetched real entries by that field client-side
// instead, rather than the disabled mock form this page used to be. Most
// entries have no subledger account (only third-party-linked accounts like
// 401/411 typically carry one) — grouped under an honest "No subledger
// account" bucket rather than hidden.
export function SubledgerReport() {
  const [filters, setFilters] = useState<LedgerFilters>(defaultLedgerFilters)
  const [draft, setDraft] = useState<LedgerFilters>(filters)
  const { data: report, isLoading, isFetching, isError, error, refetch } = useSubledgerReport(filters)
  const deleteEntry = useDeleteLedgerEntry()
  const confirm = useConfirm()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    // Same sticky-header pattern as LedgerOverview.tsx — the title/toolbar/
    // filters stick flush at main's true top and only the table body scrolls
    // internally, instead of the whole page scrolling underneath them.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListTree size={20} className="text-brand" /> Operations - View By Subledger Account
        </h2>
        <LedgerToolbar active="subledger" />
        <LedgerFilterBar
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
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            {report.groups.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
              <p className="text-xs text-text-faint">
                {report.groups.length} subledger account{report.groups.length === 1 ? '' : 's'} · click one to see its transaction lines
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpanded(new Set(report.groups.map((g) => g.subledgerAccount)))}
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
                    const key = group.subledgerAccount
                    const isOpen = expanded.has(key)
                    return (
                      <Fragment key={key || '(none)'}>
                        <tr className="bg-brand/5 cursor-pointer hover:bg-brand/10" onClick={() => toggleGroup(key)}>
                          <td colSpan={COLUMNS.length} className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-2">
                              {isOpen ? <ChevronDown size={14} className="text-brand" /> : <ChevronRight size={14} className="text-brand" />}
                              {key ? (
                                <span className="inline-block px-2 py-0.5 rounded-md bg-brand text-white text-xs font-bold tabular-nums">{key}</span>
                              ) : (
                                <span className="italic text-text-faint">No subledger account</span>
                              )}
                              <span className="text-xs text-text-faint">
                                ({group.rows.length} line{group.rows.length === 1 ? '' : 's'})
                              </span>
                            </span>
                          </td>
                        </tr>
                        {isOpen &&
                          group.rows.map((entry, i) => (
                            <tr key={`${key}-${entry.transactionNum}-${i}`} className="border-b border-border hover:bg-surface-hover">
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
                              <td className="px-3 py-2 text-text-muted">{entry.journal}</td>
                              <td className="px-3 py-2 text-text-muted whitespace-nowrap">{entry.date}</td>
                              <td className="px-3 py-2 text-text-muted">
                                <DocLink docType={entry.docType} fkDoc={entry.fkDoc} docUrl={entry.docUrl} label={entry.accountingDoc} />
                              </td>
                              <td className="px-3 py-2 text-text!">{entry.label}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.debit > 0 ? fmtZMW(entry.debit) : '-'}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.credit > 0 ? fmtZMW(entry.credit) : '-'}</td>
                              <td className="px-3 py-2 text-text-faint whitespace-nowrap">{entry.dateExport || '-'}</td>
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
                        <tr className="bg-surface-hover font-medium">
                          <td colSpan={COLUMNS.length - 4} className="px-3 py-1.5 text-right text-text-muted">
                            Total for {key || 'no subledger account'}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text!">{fmtZMW(group.totalDebit)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text!">{fmtZMW(group.totalCredit)}</td>
                          <td colSpan={2}></td>
                        </tr>
                        <tr className="bg-surface-hover/60">
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
          </div>
          <LedgerPagination meta={report.meta} onPage={(page) => setFilters({ ...filters, page })} />
        </Card>
        )}
      </div>
    </div>
  )
}
