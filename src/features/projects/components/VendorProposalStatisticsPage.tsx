import { useEffect, useState } from 'react'
import { Calculator, CircleDollarSign, FileText, RefreshCw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useVendorOptions } from '../../customers/customerOptions'
import { useThirdPartyFormOptions } from '../../customers/thirdPartyOptions.queries'
import { useAgendaFilterOptions } from '../../agenda/calendarApi.queries'
import { useVendorProposalStats } from '../vendorProposalStats.queries'
import { StatsBarChart } from './StatsBarChart'

const selectCls = 'h-9 w-full appearance-none rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60'

const METRICS = [
  { label: 'Number of quotations', pattern: /number|count|quotation|proposal/i, icon: FileText, format: 'count' },
  { label: 'Total amount', pattern: /total.*amount|amount.*total/i, icon: CircleDollarSign, format: 'amount' },
  { label: 'Average amount', pattern: /average.*amount|amount.*average/i, icon: Calculator, format: 'amount' },
] as const

function metricValue(headers: string[], row: string[] | undefined, pattern: RegExp): string | undefined {
  if (!row) return undefined
  const index = headers.findIndex((header) => pattern.test(header))
  return index >= 0 ? row[index] : undefined
}

function chartTotal(charts: NonNullable<ReturnType<typeof useVendorProposalStats>['data']>['charts'] | undefined, title: RegExp, year: string) {
  const chart = charts?.find((entry) => title.test(entry.title))
  const dataset = chart?.datasets.find((entry) => entry.label.includes(year)) ?? chart?.datasets.at(-1)
  return dataset?.data.reduce((sum, value) => sum + value, 0)
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  index,
}: {
  label: string
  value: string | undefined
  icon: typeof FileText
  index: number
}) {
  const accents = [
    'bg-sky-500/10 text-sky-500',
    'bg-emerald-500/10 text-emerald-500',
    'bg-violet-500/10 text-violet-500',
  ]

  return (
    <Card className="!h-auto !p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accents[index]}`}>
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-text!" title={value ?? 'No data'}>
            {value ?? '—'}
          </p>
        </div>
      </div>
    </Card>
  )
}

export function VendorProposalStatisticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const [socid, setSocid] = useState('')
  const [typentId, setTypentId] = useState('')
  const [categId, setCategId] = useState('')
  const [userid, setUserid] = useState('')
  const { data, isLoading, isFetching, isError, error, refetch } = useVendorProposalStats({ year, socid, typentId, categId, userid })

  const { data: vendors } = useVendorOptions()
  const { data: formOptions } = useThirdPartyFormOptions()
  const { data: agendaFilters } = useAgendaFilterOptions()
  const selectedYear = year ?? data?.yearOptions.find((option) => option.value === String(new Date().getFullYear()))?.value ?? data?.yearOptions[0]?.value ?? ''
  const activeRow = data?.table?.rows.find((row) => row[0] === selectedYear) ?? data?.table?.rows[0]
  const proposalCount = chartTotal(data?.charts, /number.*month|quotation.*month|proposal.*month/i, selectedYear)
  const proposalAmount = chartTotal(data?.charts, /amount.*month/i, selectedYear)

  useEffect(() => {
    if (year === undefined && selectedYear) setYear(selectedYear)
  }, [selectedYear, year])

  const resetFilters = () => {
    setSocid('')
    setTypentId('')
    setCategId('')
    setUserid('')
    setYear(data?.yearOptions.find((option) => option.value === String(new Date().getFullYear()))?.value ?? data?.yearOptions[0]?.value)
  }

  return (
    <div className="space-y-4">
      {isError && (
        <Card className="!h-auto border-danger/40 !bg-danger-bg text-sm font-medium text-danger-fg">
          {error instanceof Error ? error.message : 'Failed to load statistics.'}
        </Card>
      )}

      <Card className="!h-auto !p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text!">Filters</h2>
          {selectedYear && <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{selectedYear}</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text-muted">Third-party</span>
            <select value={socid} onChange={(event) => setSocid(event.target.value)} className={selectCls}>
              <option value="">All vendors</option>
              {vendors?.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text-muted">Third-party type</span>
            <select value={typentId} onChange={(event) => setTypentId(event.target.value)} className={selectCls}>
              <option value="">All types</option>
              {(formOptions?.thirdPartyTypes ?? []).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text-muted">Vendor category</span>
            <select value={categId} onChange={(event) => setCategId(event.target.value)} className={selectCls}>
              <option value="">All categories</option>
              {(formOptions?.vendorCategories ?? []).map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text-muted">Created by</span>
            <select value={userid} onChange={(event) => setUserid(event.target.value)} className={selectCls}>
              <option value="">All users</option>
              {agendaFilters?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text-muted">Status</span>
            <select disabled title="Status filtering is not available for this statistics endpoint" className={selectCls}>
              <option value="">Not available</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text-muted">Year</span>
            <select value={selectedYear} onChange={(event) => setYear(event.target.value || undefined)} className={selectCls} disabled={isLoading}>
              {(data?.yearOptions ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Search
          </button>
          <button type="button" onClick={resetFilters} className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-text-muted transition hover:bg-surface-hover">
            Reset
          </button>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METRICS.map((metric) => (
            <Card key={metric.label} className="!h-auto !p-4" aria-label={`Loading ${metric.label}`}>
              <div className="h-11 animate-pulse rounded-lg bg-surface-hover" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METRICS.map((metric, index) => (
            <SummaryMetric
              key={metric.label}
              label={metric.label}
              value={
                (data?.table ? metricValue(data.table.headers, activeRow, metric.pattern) : undefined)
                ?? (index === 0 && proposalCount !== undefined
                  ? proposalCount.toLocaleString()
                  : index === 1 && proposalAmount !== undefined
                    ? proposalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : index === 2 && proposalAmount !== undefined && proposalCount
                      ? (proposalAmount / proposalCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : undefined)
              }
              icon={metric.icon}
              index={index}
            />
          ))}
        </div>
      )}

      {(data?.charts ?? []).length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {(data?.charts ?? []).map((chart) => (
            <Card key={chart.title} className={`!h-auto !p-4 ${chart.type === 'line' ? 'xl:col-span-2' : ''}`}>
              <StatsBarChart chart={chart} />
            </Card>
          ))}
        </div>
      ) : !isLoading && !isError ? (
        <Card className="!h-auto py-8 text-center text-sm text-text-muted">No chart data is available for the selected filters.</Card>
      ) : null}

      {data?.table && (
        <Card className="!h-auto !p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text!">Yearly breakdown</h2>
            {selectedYear && <span className="rounded-md border border-border px-2 py-1 text-xs text-text-muted">{selectedYear}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                  {data.table.headers.map((header, index) => (
                    <th key={`${header}-${index}`} className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.table.rows.map((row, rowIndex) => (
                  <tr key={`${row[0] ?? 'row'}-${rowIndex}`} className={`border-b border-border/70 last:border-0 ${row[0] === selectedYear ? 'bg-brand/10' : ''}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cellIndex}-${cell}`} className="whitespace-nowrap px-3 py-2 text-text-muted">{cell}</td>
                    ))}
                  </tr>
                ))}
                {!data.table.rows.length && (
                  <tr><td colSpan={data.table.headers.length} className="px-3 py-5 text-center text-sm text-text-faint">No vendor proposal statistics available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
