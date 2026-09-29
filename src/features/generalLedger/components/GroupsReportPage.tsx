import { useState, type ComponentType } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useGroupsReport } from '../groupsReport.queries'

const dateCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const NUMERIC = /^-?[\d,]+(\.\d+)?$/

// The two "by groups" income/outcome reports: the backend prints one table for
// the chosen date range (this year by default); every row, group and total
// shown here is read from it.
export function GroupsReportPage({
  icon: Icon,
  title,
  path,
  firstHeader,
  emptyText,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  path: string
  firstHeader: RegExp
  emptyText: string
}) {
  const year = new Date().getFullYear()
  const [start, setStart] = useState(`${year}-01-01`)
  const [end, setEnd] = useState(`${year}-12-31`)
  const { data, isLoading, isFetching, isError, error, refetch } = useGroupsReport(path, firstHeader, start, end)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            Start date
            <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className={dateCls} />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            End date
            <input type="date" value={end} onChange={(e) => e.target.value && setEnd(e.target.value)} className={dateCls} />
          </label>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading report…" />}
      {(isError || (!isLoading && !data)) && <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && (
        <Card className={`!p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {data.headers.map((h, i) => (
                    <th key={i} className={`font-medium px-3 py-2 whitespace-nowrap ${i > 1 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={data.headers.length} className="px-3 py-8 text-center italic text-text-faint">
                      {emptyText}
                    </td>
                  </tr>
                )}
                {data.rows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-border ${row.kind === 'total' ? 'bg-surface font-semibold' : row.kind === 'section' ? 'bg-surface/50 font-semibold text-text!' : ''}`}>
                    {row.cells.map((c, ci) => (
                      <td key={ci} className={`px-3 py-2.5 whitespace-nowrap ${NUMERIC.test(c) ? 'text-right tabular-nums' : ''}`}>
                        {c}
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
