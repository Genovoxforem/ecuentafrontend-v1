import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDown, FolderArchive, Loader2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyListLayout, ScrollCard, STICKY_THEAD, STICKY_TFOOT } from '../../../shared/components/layout/StickyListLayout'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAccountingFiles, useDownloadAccountingFiles, type AccountingFilesSearch } from '../accountingFiles.queries'
import type { AccountingFileRow } from '../accountingFilesParser'

const dateCls = 'h-10 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const th = 'px-3 py-2.5 text-xs font-semibold text-text whitespace-nowrap'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// The page opens on the current month, as the backend's own period picker does.
function currentMonth(): { dateStart: string; dateEnd: string } {
  const now = new Date()
  return { dateStart: iso(new Date(now.getFullYear(), now.getMonth(), 1)), dateEnd: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
}

function RefCell({ row }: { row: AccountingFileRow }) {
  const to = resolveLegacyRoute(row.ref.href)
  return to ? (
    <Link to={to} className="text-brand hover:underline">
      {row.ref.text}
    </Link>
  ) : (
    <>{row.ref.text}</>
  )
}

// The backend's own "Export source documents" page (compta/accounting-files.php): pick the period
// and the kinds of document, list them, and download the ZIP of their files.
export function ExportAccountingDocumentsPage() {
  const [period, setPeriod] = useState(currentMonth)
  const [kinds, setKinds] = useState<Set<string> | null>(null)
  const [search, setSearch] = useState<AccountingFilesSearch | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useAccountingFiles(search)
  const download = useDownloadAccountingFiles()

  // Until a search has run the form's own state is what the page opened with: every kind ticked.
  const ticked = kinds ?? new Set(data?.choices.filter((c) => c.checked).map((c) => c.name) ?? [])

  const run = () => {
    setProblem(null)
    setNotice(null)
    if (!period.dateStart || !period.dateEnd) return setProblem('Choose the report period.')
    if (period.dateStart > period.dateEnd) return setProblem('The period ends before it starts.')
    if (ticked.size === 0) return setProblem('Select at least one kind of document.')
    setSearch({ ...period, kinds: [...ticked] })
  }

  const doDownload = () => {
    if (!data || !search) return
    setProblem(null)
    setNotice(null)
    download.mutate(
      { fields: data.downloadFields, search },
      { onSuccess: (name) => setNotice(`Downloaded ${name}.`), onError: (e) => setProblem(e instanceof Error ? e.message : 'The download was refused.') },
    )
  }

  const result = data && search ? data : null

  return (
    <StickyListLayout
      header={
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <FolderArchive size={20} className="text-brand" /> Export Source Documents
          </h2>
          {data && (
            <Card className="!h-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  run()
                }}
                className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(18rem,26rem)_1fr_auto] lg:items-end"
              >
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-text">Report period:</span>
                  <div className="flex items-center gap-2">
                    <input type="date" value={period.dateStart} onChange={(e) => setPeriod({ ...period, dateStart: e.target.value })} className={`${dateCls} flex-1`} aria-label="Start date" />
                    <span className="text-text-faint">-</span>
                    <input type="date" value={period.dateEnd} onChange={(e) => setPeriod({ ...period, dateEnd: e.target.value })} className={`${dateCls} flex-1`} aria-label="End date" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {data.environment && <span className="text-xs text-text-faint">{data.environment}</span>}
                  <div className="flex flex-wrap gap-2">
                    {data.choices.map((c) => {
                      const on = ticked.has(c.name)
                      return (
                        <button
                          key={c.name}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            const next = new Set(ticked)
                            if (on) next.delete(c.name)
                            else next.add(c.name)
                            setKinds(next)
                          }}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${on ? 'border-brand bg-brand text-white' : 'border-brand text-brand hover:bg-brand/10'}`}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isFetching}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
                </button>
              </form>
            </Card>
          )}
        </>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading the export form…" />}
      {isError && <LegacyErrorCard title="Couldn't load the export form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {notice && <div className="rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{notice}</div>}
      {(problem || (result && result.errors.length > 0)) && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {problem ?? result?.errors.join('\n')}
        </div>
      )}

      {result && result.searched && (
        <>
          <Card className="!h-auto flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-text">
              <span className="font-semibold">{result.period}</span>
              <span className="ml-3 text-text-muted">
                {result.rows.length} document{result.rows.length === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              disabled={download.isPending}
              onClick={doDownload}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {download.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Download Report
            </button>
          </Card>

          <ScrollCard className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className={STICKY_THEAD}>
                <tr className="border-b border-border bg-surface">
                  {result.headers.map((h, i) => (
                    <th key={h} className={`${th} ${i >= 6 && i <= 8 ? 'text-right' : i === 1 || i === 2 ? 'text-center' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={result.headers.length || 14} className="px-3 py-8 text-center italic text-text-faint">
                      No item.
                    </td>
                  </tr>
                )}
                {result.rows.map((r, i) => (
                  <tr key={`${r.ref.text}-${i}`} className="border-b border-border align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-text!">{r.type}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-text-muted">{r.date}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-text-muted">{r.dateDue}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text!">
                      <RefCell row={r} />
                    </td>
                    <td className="px-3 py-2.5">
                      {/* Attached files: a download, not a backend page. */}
                      {r.documents.map((d) => (
                        <a key={d.href ?? d.text} href={d.href ?? undefined} target="_blank" rel="noopener noreferrer" className="block text-brand hover:underline">
                          {d.text}
                        </a>
                      ))}
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{r.paid}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">{r.totalHt}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">{r.totalTtc}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">{r.totalVat}</td>
                    <td className="max-w-48 truncate px-3 py-2.5 text-text-muted" title={r.thirdParty}>
                      {r.thirdParty}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.code}</td>
                    <td className="px-3 py-2.5 text-text-muted">{r.country}</td>
                    <td className="px-3 py-2.5 text-right text-text-muted">{r.vatId}</td>
                    {result.headers.length > 13 && <td className="px-3 py-2.5 text-text-muted">{r.currency}</td>}
                  </tr>
                ))}
              </tbody>
              {result.totals.length > 0 && result.rows.length > 0 && (
                <tfoot className={STICKY_TFOOT}>
                  {result.totals.map((t) => (
                    <tr key={t.label} className="border-t border-border bg-brand/10 font-semibold">
                      <td colSpan={6} className="px-3 py-2 text-right text-text!">
                        {t.label}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{t.ht}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{t.ttc}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{t.vat}</td>
                      <td colSpan={Math.max(result.headers.length - 9, 1)} />
                    </tr>
                  ))}
                </tfoot>
              )}
            </table>
          </ScrollCard>
        </>
      )}
    </StickyListLayout>
  )
}
