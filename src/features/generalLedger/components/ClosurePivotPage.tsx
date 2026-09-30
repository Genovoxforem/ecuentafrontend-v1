import { useState, type ComponentType } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useLegacyList } from '../legacyList.queries'

// The 12-month "movements by month" pivot shared by accountancy/closure/index.php
// (Annual closure) and closure/validate.php (Validate movements): a header row
// Jan … Dec / Total and one row of movement counts for the chosen year, both
// read from the backend page. `year` is the page's own GET parameter.
export function ClosurePivotPage({
  icon: Icon,
  title,
  path,
  note,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  path: string
  note?: string
}) {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, isFetching, isError, error, refetch } = useLegacyList(path, /^Jan/, { year: String(year) })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
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

      {note && (
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">{note}</p>
        </Card>
      )}

      {isLoading && <LegacyLoadingCard label="Loading movements…" />}
      {(isError || (!isLoading && !data)) && <LegacyErrorCard title="Couldn't load the movements" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && (
        <Card className={`!p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {data.headers.map((h) => (
                    <th key={h} className="font-medium px-3 py-2 text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={data.headers.length} className="px-3 py-6 text-center italic text-text-faint">
                      No movements for {year}.
                    </td>
                  </tr>
                )}
                {data.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-3 py-3 text-center tabular-nums ${cell.text === '0' ? 'text-text-faint' : 'font-medium text-text!'}`}>
                        {cell.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
