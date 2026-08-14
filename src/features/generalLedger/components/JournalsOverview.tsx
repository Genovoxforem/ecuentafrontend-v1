import { useState, type FormEvent } from 'react'
import { BookText, Search, X as XIcon, Loader2, AlertTriangle, ExternalLink, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { resolveBackendAsset } from '../../../api/backends'
import { ROUTES } from '../../../routes'
import { useJournalsReport, defaultLedgerFilters, type LedgerFilters } from '../generalLedger.queries'

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
    <Card>
      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          onSubmit()
        }}
        className="flex flex-wrap items-end gap-4"
      >
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          <span>From</span>
          <input
            type="date"
            value={draft.dateStart}
            onChange={(e) => onChange({ ...draft, dateStart: e.target.value })}
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          <span>To</span>
          <input
            type="date"
            value={draft.dateEnd}
            onChange={(e) => onChange({ ...draft, dateEnd: e.target.value })}
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          <span>Account code</span>
          <input
            type="text"
            placeholder="e.g. 401, 570..."
            value={draft.accountCode}
            onChange={(e) => onChange({ ...draft, accountCode: e.target.value })}
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 w-40"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
          <button type="button" onClick={onClear} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
            <XIcon size={14} />
            Clear
          </button>
        </div>
      </form>
    </Card>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthIssue = message.toLowerCase().includes('signed in')
  return (
    <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
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

const COLUMNS = ['Num.', 'Journal', 'Date', 'Accounting Doc.', 'Account', 'Subledger', 'Label', 'Debit', 'Credit', 'Date Export']

export function JournalsOverview() {
  const [filters, setFilters] = useState<LedgerFilters>(defaultLedgerFilters)
  const [draft, setDraft] = useState<LedgerFilters>(filters)
  const { data: report, isLoading, isFetching, isError, error, refetch } = useJournalsReport(filters)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <BookText size={20} className="text-brand" /> Operations - Journals
        </h2>
      </div>

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

      {isError && <ErrorState message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {isLoading && (
        <Card className="items-center justify-center gap-2 py-10 text-center">
          <Loader2 size={20} className="animate-spin text-brand" />
          <p className="text-sm text-text-faint">Loading real journal entries from the accounting backend…</p>
        </Card>
      )}

      {report && (
        <Card className="!p-0 !h-auto overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
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
                        {entry.cardUrl ? (
                          <a href={resolveBackendAsset(entry.cardUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline">
                            <FileText size={12} />
                            {entry.transactionNum}
                            <ExternalLink size={10} className="text-text-faint" />
                          </a>
                        ) : (
                          entry.transactionNum
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{entry.journal}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{entry.date}</td>
                      <td className="px-3 py-2 text-text-muted">{entry.accountingDoc || '-'}</td>
                      <td className="px-3 py-2 text-text!">{entry.accountCode}</td>
                      <td className="px-3 py-2 text-text-muted">{entry.subledgerAccount || '-'}</td>
                      <td className="px-3 py-2 text-text!">{entry.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.debit > 0 ? fmtZMW(entry.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.credit > 0 ? fmtZMW(entry.credit) : '-'}</td>
                      <td className="px-3 py-2 text-text-faint whitespace-nowrap">{entry.dateExport || '-'}</td>
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
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
