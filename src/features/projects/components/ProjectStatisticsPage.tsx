import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Coins, RefreshCw, Target, UsersRound } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProjectStats } from '../projectStats.queries'
import { StatsBarChart } from './StatsBarChart'
import type { StatsChart, StatsResultsTable } from '../statsHtmlParser'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none w-full'

const SUMMARY_METRICS = [
  {
    label: 'Total Projects',
    icon: BriefcaseBusiness,
    color: 'blue',
    column: /(?:number|total|created).*project|project.*(?:number|total)/i,
    chart: /created projects|number of projects/i,
  },
  {
    label: 'Total Lead Amount',
    icon: Coins,
    color: 'violet',
    column: /lead amount|amount of leads|total amount/i,
    chart: /amount of leads by month|lead amount by month/i,
  },
  {
    label: 'Average Lead Amount',
    icon: Target,
    color: 'amber',
    column: /average.*(?:lead|amount)/i,
    chart: null,
  },
  {
    label: 'Weighted Lead Amount',
    icon: UsersRound,
    color: 'teal',
    column: /weighted.*(?:lead|amount)/i,
    chart: /weighted.*(?:leads|lead amount|amount)/i,
  },
] as const

const METRIC_COLORS: Record<(typeof SUMMARY_METRICS)[number]['color'], string> = {
  blue: 'from-sky-500/15 to-blue-500/5 text-sky-300 bg-sky-500/15',
  violet: 'from-violet-500/15 to-purple-500/5 text-violet-300 bg-violet-500/15',
  amber: 'from-amber-500/15 to-orange-500/5 text-amber-300 bg-amber-500/15',
  teal: 'from-teal-500/15 to-cyan-500/5 text-teal-300 bg-teal-500/15',
}

function parseMetric(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatMetric(value: number | undefined, isAmount: boolean): string {
  if (value === undefined) return '—'
  return value.toLocaleString(undefined, {
    maximumFractionDigits: isAmount ? 2 : 0,
    minimumFractionDigits: isAmount ? 2 : 0,
  })
}

function tableMetric(table: StatsResultsTable | null | undefined, row: string[] | undefined, pattern: RegExp) {
  if (!table || !row) return undefined
  const index = table.headers.findIndex((header) => pattern.test(header))
  return index >= 0 ? parseMetric(row[index]) : undefined
}

function chartMetric(charts: StatsChart[] | undefined, pattern: RegExp, selectedYear: string) {
  const chart = charts?.find((entry) => pattern.test(entry.title))
  if (!chart) return undefined
  const dataset = chart.datasets.find((entry) => selectedYear && entry.label.includes(selectedYear)) ?? chart.datasets.at(-1)
  return dataset?.data.reduce((total, value) => total + value, 0)
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: (typeof SUMMARY_METRICS)[number]['icon']
  tone: (typeof SUMMARY_METRICS)[number]['color']
}) {
  const colors = METRIC_COLORS[tone].split(' ')
  return (
    <Card className="!h-auto !p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br ${colors[0]} ${colors[1]} ${colors[2]}`}>
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-text-muted">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-text!" title={value}>{value}</p>
        </div>
      </div>
    </Card>
  )
}

function LoadingSummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading project summaries">
      {SUMMARY_METRICS.map(({ label }) => (
        <Card key={label} className="!h-auto !p-3">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 animate-pulse rounded-xl bg-surface-hover" />
            <span className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function ProjectStatisticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const [socid, setSocid] = useState('')
  const { data, isLoading, isError, error, refetch, isFetching } = useProjectStats(year, socid || undefined)
  const { data: customers = [] } = useCustomerOptions()
  const customerOptions = useMemo(() => customers.map((customer) => ({ value: customer.id, label: customer.name })), [customers])
  const selectedYear = year ?? data?.selectedYear ?? ''

  useEffect(() => {
    if (year === undefined && data?.selectedYear) setYear(data.selectedYear)
  }, [data?.selectedYear, year])

  const activeRow = data?.table?.rows.find((row) => row[0] === selectedYear) ?? data?.table?.rows[0]
  const metricValues = SUMMARY_METRICS.map((metric) => {
    let value = tableMetric(data?.table, activeRow, metric.column)
    if (value === undefined && metric.chart) value = chartMetric(data?.charts, metric.chart, selectedYear)
    if (value === undefined && metric.label === 'Average Lead Amount') {
      const amount = tableMetric(data?.table, activeRow, /lead amount|amount of leads|total amount/i)
        ?? chartMetric(data?.charts, /amount of leads by month|lead amount by month/i, selectedYear)
      const count = tableMetric(data?.table, activeRow, /(?:number|total|created).*project|project.*(?:number|total)/i)
        ?? chartMetric(data?.charts, /created projects|number of projects/i, selectedYear)
      if (amount !== undefined && count) value = amount / count
    }
    return { ...metric, value }
  })

  const charts = data?.charts ?? []

  return (
    <div className="space-y-3">
      <Card className="!h-auto !p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-muted">Third-party</label>
            <SearchableSelect value={socid} onChange={setSocid} options={customerOptions} placeholder="All third-parties" />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-muted">Year</label>
            <select value={selectedYear} onChange={(event) => setYear(event.target.value || undefined)} className={selectCls} disabled={isLoading}>
              {(data?.yearOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </Card>

      {isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-sm font-medium text-danger-fg">
          {error instanceof Error ? error.message : 'Failed to load project statistics.'}
        </Card>
      )}

      {isLoading ? (
        <LoadingSummaryCards />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricValues.map(({ label, value, icon, color }, index) => (
            <SummaryCard
              key={label}
              label={label}
              value={formatMetric(value, index > 0)}
              icon={icon}
              tone={color}
            />
          ))}
        </div>
      )}

      {charts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {charts.map((chart) => (
            <Card key={chart.title} className="!h-auto !p-3">
              <StatsBarChart chart={chart} />
            </Card>
          ))}
        </div>
      )}

      <Card className="!h-auto !p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text!">Project Statistics by Year</h2>
          {selectedYear && <span className="rounded-md border border-border px-2 py-1 text-xs text-text-muted">{selectedYear}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                {(data?.table?.headers ?? ['Year', 'Number of projects', 'Lead amount', 'Average lead amount', 'Weighted lead amount']).map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.table?.rows.map((row, rowIndex) => (
                <tr key={`${row[0] ?? 'row'}-${rowIndex}`} className={`border-b border-border/70 last:border-0 ${row[0] === selectedYear ? 'bg-brand/10' : ''}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cellIndex}-${cell}`} className="whitespace-nowrap px-3 py-2 text-text-muted">{cell}</td>
                  ))}
                </tr>
              ))}
              {!isLoading && !data?.table?.rows.length && (
                <tr><td colSpan={data?.table?.headers.length ?? 5} className="px-3 py-5 text-center text-sm text-text-faint">No project statistics available for this selection.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
