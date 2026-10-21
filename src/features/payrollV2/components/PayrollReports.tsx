import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MONTHS, pv2Get, type Params } from '../payrollV2.api'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, TablePanel, Td, Th } from './PayrollV2Chrome'

const now = new Date()

// The report tabs the classic page lists, each with the action it calls and
// the period parameters that action takes.
const TABS: Array<{ key: string; label: string; action: string; period: 'month' | 'year' | 'none' }> = [
  { key: 'summary', label: 'Statutory Summary', action: 'statutory', period: 'month' },
  { key: 'napsa', label: 'NAPSA', action: 'napsa_report', period: 'month' },
  { key: 'nhima', label: 'NHIMA', action: 'nhima_report', period: 'month' },
  { key: 'ytd', label: 'YTD', action: 'ytd_report', period: 'year' },
  { key: 'gratuity', label: 'Gratuity', action: 'gratuity_report', period: 'none' },
  { key: 'employer_basics', label: 'Employer Basics', action: 'employer_basics', period: 'none' },
  { key: 'gl', label: 'GL Journal', action: 'gl_journal', period: 'month' },
  { key: 'employer_cost', label: 'Employer Cost', action: 'employer_cost', period: 'year' },
  { key: 'audit', label: 'Audit Log', action: 'audit_log', period: 'none' },
]

const HIDDEN_COLUMNS = new Set(['entity', 'rowid'])

const titleCase = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// Report rows differ per report, so the columns come from the row itself
// rather than a hard-coded list that would silently drop a column the
// backend adds.
function ReportTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = Object.keys(rows[0]).filter((key) => !HIDDEN_COLUMNS.has(key))
  const isNumeric = (value: unknown) => typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))
  return (
    <table className="w-full">
      <thead className="bg-surface">
        <tr>
          {columns.map((column) => (
            <Th key={column} className={isNumeric(rows[0][column]) ? 'text-right' : ''}>
              {titleCase(column)}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-border">
            {columns.map((column) => (
              <Td key={column} className={isNumeric(row[column]) ? 'text-right tabular-nums' : ''}>
                {row[column] === null || row[column] === '' ? '—' : String(row[column])}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PayrollReports() {
  const [tabKey, setTabKey] = useState('summary')
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0]
  const params: Params = tab.period === 'month' ? { month, year } : tab.period === 'year' ? { year } : {}

  const report = useQuery({
    queryKey: ['payroll-v2', 'report', tab.key, params],
    queryFn: () => pv2Get<unknown>('reports.php', tab.action, params),
  })

  // Some reports answer with a list of rows, others with a single totals object.
  const raw = report.data
  const rows: Array<Record<string, unknown>> = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : raw && typeof raw === 'object' ? [raw as Record<string, unknown>] : []

  return (
    <div className="space-y-4">
      <PanelCard title="Reports">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTabKey(item.key)}
              className={
                item.key === tabKey
                  ? 'rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab.period !== 'none' && (
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
            {tab.period === 'month' && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-muted">Month</span>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30">
                  {MONTHS.slice(1).map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Year</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
            </label>
          </div>
        )}
      </PanelCard>

      {report.isError && <ErrorCard error={report.error} onRetry={() => report.refetch()} />}

      <TablePanel title={tab.label}>
        {report.isLoading ? (
          <table className="w-full">
            <tbody>
              <LoadingRows cols={4} />
            </tbody>
          </table>
        ) : rows.length === 0 ? (
          <table className="w-full">
            <tbody>
              <EmptyRow colSpan={4} label="No data for this report and period." />
            </tbody>
          </table>
        ) : (
          <ReportTable rows={rows} />
        )}
      </TablePanel>
    </div>
  )
}
