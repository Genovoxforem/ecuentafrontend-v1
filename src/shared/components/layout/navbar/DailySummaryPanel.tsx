import { ChevronsLeft, X } from 'lucide-react'
import { useDailySummary, type DailySummaryTable } from '../../../../features/dailySummary/dailySummary.queries'

function SummaryTable({ table }: { table: DailySummaryTable }) {
  const wide = table.headers.length > 4
  return (
    <div className={`overflow-x-auto rounded-md border ${table.highlight ? 'border-success/50' : 'border-border'}`}>
      <table className={`w-full border-collapse ${wide ? 'min-w-[44rem]' : ''}`}>
        {table.headers.length > 0 && (
          <thead>
            <tr className="bg-surface-alt">
              {table.headers.map((h, i) => (
                <th key={i} className={`border-b border-border px-2 py-2 text-xs font-semibold text-text ${h.end ? 'text-right' : 'text-left'}`}>
                  {h.text}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={ri} className={`border-t border-border ${r.total ? (table.highlight ? 'bg-success-bg font-semibold text-success-fg' : 'bg-surface-alt font-semibold') : ''}`}>
              {r.cells.map((c, ci) => (
                <td key={ci} colSpan={c.colSpan} className={`px-2 py-2 text-xs ${c.end ? 'text-right tabular-nums' : c.colSpan > 2 && !r.total ? 'text-center text-text-muted' : 'text-left'}`}>
                  {c.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// "Daily Summary – With VAT & P&L", read from the classic page's own summary block
// (see dailySummary.queries.ts) so the figures are the backend's, not recomputed here.
export function DailySummaryPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useDailySummary()

  return (
    <div className="absolute right-0 top-full z-30 mt-1 flex max-h-[calc(100vh-5rem)] w-[min(44rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-brand">
          <ChevronsLeft size={18} /> Daily Summary
        </h3>
        <button type="button" onClick={onClose} title="Close" className="rounded-md p-1 text-danger/70 hover:bg-surface-alt hover:text-danger">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto soft-scrollbar px-4 py-3">
        {isLoading && <p className="py-8 text-center text-sm text-text-faint">Loading…</p>}
        {isError && (
          <div className="py-8 text-center text-sm">
            <p className="text-danger">{error instanceof Error ? error.message : 'Could not load the daily summary.'}</p>
            <button type="button" onClick={() => refetch()} className="mt-2 text-brand hover:underline">
              Retry
            </button>
          </div>
        )}
        {data && (
          <>
            <h4 className="text-lg font-semibold text-text!">{data.title}</h4>
            <div className="mb-4 mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-text">
              <span>Company Name : {data.company}</span>
              <span>Date : {data.date}</span>
            </div>

            <div className="space-y-5">
              {data.sections.map((s) => {
                const side = s.tables.filter((t) => t.side)
                const rest = s.tables.filter((t) => !t.side)
                return (
                  <section key={s.title}>
                    <h5 className="mb-2 text-sm font-bold text-text-muted">{s.title}</h5>
                    <div className="space-y-3">
                      {side.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {side.map((t, i) => (
                            <SummaryTable key={i} table={t} />
                          ))}
                        </div>
                      )}
                      {rest.map((t, i) => (
                        <SummaryTable key={i} table={t} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
