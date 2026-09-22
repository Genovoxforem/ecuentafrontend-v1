import { useState } from 'react'
import { BookText, Loader2, AlertTriangle, FileText, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useJournalsReport, useDeleteLedgerEntry, defaultLedgerFilters, type LedgerFilters } from '../generalLedger.queries'
import { LedgerToolbar, LedgerFilterBar, LedgerPagination } from './LedgerControls'
import { DocLink } from './DocLink'

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthIssue = /signed in|forbidden|403/i.test(message)
  return (
    <Card className="!h-auto !bg-danger-bg border-danger/40 flex items-start gap-3">
      <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger-fg">Couldn't load the journals</p>
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

const COLUMNS = ['Num.', 'Journal', 'Date', 'Accounting Doc.', 'Account', 'Subledger', 'Label', 'Debit', 'Credit', 'Date Export', 'Lettering Code', '']

// The real page's own "View Flat List" mode (list.php) — same real API and
// same LedgerFilters/LedgerControls this feature's other two views share
// (see LedgerOverview.tsx / SubledgerReport.tsx).
export function JournalsOverview() {
  const [filters, setFilters] = useState<LedgerFilters>(defaultLedgerFilters)
  const [draft, setDraft] = useState<LedgerFilters>(filters)
  const { data: report, isLoading, isFetching, isError, error, refetch } = useJournalsReport(filters)
  const deleteEntry = useDeleteLedgerEntry()

  return (
    // Same sticky-header pattern as LedgerOverview.tsx/SubledgerReport.tsx —
    // the title/toolbar/filters stick flush at main's true top and only the
    // table body scrolls internally, instead of the whole page scrolling.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <BookText size={20} className="text-brand" /> Operations - Journals
        </h2>
        <LedgerToolbar active="flat" />
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
            <p className="text-sm text-text-faint">Loading real journal entries from the accounting backend…</p>
          </Card>
        )}

        {report && (
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
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
                {report.rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No journal entries in this range.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((entry, i) => (
                    <tr key={`${entry.transactionNum}-${entry.accountCode}-${i}`} className="border-b border-border hover:bg-surface-hover">
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
                      <td className="px-3 py-2 text-text!">{entry.accountCode}</td>
                      <td className="px-3 py-2 text-text-muted">{entry.subledgerAccount || '-'}</td>
                      <td className="px-3 py-2 text-text!">{entry.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.debit > 0 ? fmtZMW(entry.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.credit > 0 ? fmtZMW(entry.credit) : '-'}</td>
                      <td className="px-3 py-2 text-text-faint whitespace-nowrap">{entry.dateExport || '-'}</td>
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
                              onClick={() => {
                                if (entry.deleteUrl && window.confirm('Delete this accounting entry on the real backend? This cannot be undone.')) deleteEntry.mutate(entry.deleteUrl)
                              }}
                              className="p-1 rounded text-text-faint hover:text-danger hover:bg-danger-bg disabled:opacity-40"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-brand/10 font-semibold">
                    <td colSpan={7} className="px-3 py-2 text-right text-text!">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(report.totalDebit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(report.totalCredit)}</td>
                    <td colSpan={3}></td>
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
