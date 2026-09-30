import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, GitCompareArrows, Link2, Loader2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useBindAutomatically, useBindingIndex } from '../../bindingIndex.queries'
import type { BindingCell, BindingSegment } from '../../bindingIndexParser'

const NUMERIC = /^-?[\d,]+(\.\d+)?$/

// The backend's links to its own "lines to bind" / "bound lines" lists, as the React pages.
const LIST_ROUTES: [RegExp, string][] = [
  [/accountancy\/customer\/list\.php/, ROUTES.ledgerCustomerBindingToDispatch],
  [/accountancy\/customer\/lines\.php/, ROUTES.ledgerCustomerBindingDispatched],
  [/accountancy\/supplier\/list\.php/, ROUTES.ledgerVendorBindingToDispatch],
  [/accountancy\/supplier\/lines\.php/, ROUTES.ledgerVendorBindingDispatched],
  [/accountancy\/expensereport\/list\.php/, ROUTES.ledgerExpenseReportBindingToDispatch],
  [/accountancy\/expensereport\/lines\.php/, ROUTES.ledgerExpenseReportBindingDispatched],
]
const listRoute = (href: string | undefined) => (href ? LIST_ROUTES.find(([re]) => re.test(href))?.[1] : undefined)

function Segments({ segments }: { segments: BindingSegment[] }) {
  return (
    <>
      {segments.map((s, i) => {
        const to = listRoute(s.href)
        const inner = s.bold ? <b>{s.text}</b> : s.text
        return to ? (
          <Link key={i} to={to} className="text-brand hover:underline">
            {inner}
          </Link>
        ) : (
          <span key={i}>{inner}</span>
        )
      })}
    </>
  )
}

const cellClass = (c: BindingCell, i: number) => `px-3 py-2 ${i > 0 && NUMERIC.test(c.text) ? 'whitespace-nowrap text-right tabular-nums' : ''} ${c.bold ? 'font-bold' : ''} text-text`

// The backend's own binding overview (accountancy/{customer,supplier,expensereport}/index.php) for
// the chosen year: what is not bound yet, what is bound, the totals, and "Bind Automatically".
export function BindingIndexPage({ title, sourcePath }: { title: string; sourcePath: string }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const path = `/${sourcePath}`
  const { data, isLoading, isFetching, isError, error, refetch } = useBindingIndex(path, year)
  const bind = useBindAutomatically(path, year)
  const confirm = useConfirm()
  const [notice, setNotice] = useState<string | null>(null)

  const run = async () => {
    setNotice(null)
    const ok = await confirm({
      title: 'Bind automatically?',
      message: `Let the backend bind, in one go, every line whose product has an accounting account (year ${year}).`,
      warningTitle: 'This changes the accounting binding of many lines.',
      warningMessage: 'Bound lines leave the "not bound" overview. Lines can be re-bound afterwards from the Dispatched list.',
      variant: 'default',
      confirmLabel: 'Bind Automatically',
    })
    if (!ok) return
    bind.mutate(undefined, { onSuccess: (message) => setNotice(message || 'The backend ran the automatic binding.') })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <GitCompareArrows size={20} className="text-brand" /> {title}
        </h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text" aria-label="Previous year">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-text! px-1.5">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text" aria-label="Next year">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading binding overview…" />}
      {isError && <LegacyErrorCard title="Couldn't load the binding overview" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {notice && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{notice}</div>}
      {bind.isError && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {bind.error instanceof Error ? bind.error.message : 'The request was refused.'}
        </div>
      )}

      {data && (
        <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {data.info.length > 0 && (
            <div className="space-y-1 rounded-lg border border-info/40 bg-info-bg/50 px-4 py-3 text-sm text-info-fg">
              {data.info.map((line, i) => (
                <p key={i}>
                  <Segments segments={line} />
                </p>
              ))}
            </div>
          )}

          {data.sections.map((section, si) => (
            <section key={`${section.title}-${si}`} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-medium text-text!">{section.title}</h3>
                {section.action && (
                  <button type="button" disabled={bind.isPending} onClick={run} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                    {bind.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {section.action.label}
                  </button>
                )}
              </div>
              {section.tables.map((t, ti) => (
                <Card key={ti} className="!h-auto !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          {t.headers.map((h, i) => (
                            <th key={`${h}-${i}`} className={`px-3 py-2.5 text-xs font-semibold text-text whitespace-nowrap ${i >= t.headers.length - 13 ? 'text-right' : 'text-left'}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.rows.length === 0 && (
                          <tr>
                            <td colSpan={t.headers.length} className="px-3 py-4 text-center italic text-text-faint">
                              Nothing for {year}.
                            </td>
                          </tr>
                        )}
                        {t.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-border last:border-0">
                            {row.map((cell, ci) => (
                              <td key={ci} className={cellClass(cell, ci)}>
                                <Segments segments={cell.segments} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
