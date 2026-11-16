import { useMemo, useState } from 'react'
import { BarChart3, Calculator, LineChart, Package, PieChart, ShoppingCart, Wallet } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { monthEnd, monthStart } from '../reportFormat'
import { useOverallReport, type OverallBlock } from '../overallReport.data'
import { inputCls, KpiCard, RangeBar, ReportError, ReportLoading, SimpleTable, TabBar, secondaryBtn, type ReportTone } from './ReportWidgets'

const KPI_STYLE: Array<{ tone: ReportTone; icon: typeof BarChart3 }> = [
  { tone: 'blue', icon: LineChart },
  { tone: 'green', icon: ShoppingCart },
  { tone: 'amber', icon: Package },
  { tone: 'rose', icon: PieChart },
  { tone: 'teal', icon: Calculator },
  { tone: 'purple', icon: Wallet },
]

const NUMERIC = /^[-(]?[\d,]+(\.\d+)?%?\)?$|^ZMW [-\d,.()]+$/

function Block({ block, i }: { block: OverallBlock; i: number }) {
  if (block.kind === 'caption') return <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand">{block.text}</h3>
  if (block.kind === 'note') return <p className="text-sm text-text-muted">{block.text}</p>
  if (block.kind === 'stat') return <span className="mr-2 inline-block rounded-md border border-border bg-surface px-3 py-2 text-sm text-text">{block.text}</span>
  const { headers, rows } = block.table
  if (rows.length > 15) return <LegacyReportTable key={i} title="Overall Report" table={block.table} />
  const right = headers.map((_, c) => c).filter((c) => c > 0 && rows.length > 0 && rows.every((r) => NUMERIC.test(r[c] ?? '') || (r[c] ?? '') === '—' || (r[c] ?? '') === ''))
  return <SimpleTable headers={headers} rows={rows} empty="No data" right={right} />
}

// "Overall Analysis Report" of the Reports Center: the classic "Overall Report Dashboard" (custom/reports/overall_report.php) — the header with its period and
// warehouse, the Entity / Warehouse / Date Range filter with Filter and Clear, the six figures (Total Sales, Purchases, Stock Value, Gross Profit, Net Profit,
// Cash Flow), the tab bar and the tab's tables. Data: overallReport.data.ts.
export function OverallReportView() {
  const defaults = { entity: '', warehouse: '', start: monthStart(), end: monthEnd() }
  const [entity, setEntity] = useState(defaults.entity)
  const [warehouse, setWarehouse] = useState(defaults.warehouse)
  const [range, setRange] = useState({ start: defaults.start, end: defaults.end })
  const [tab, setTab] = useState('dashboard')
  const q = useOverallReport({ entity, warehouse, tab, from: range.start, to: range.end })
  const d = q.data
  const tabs = useMemo(() => d?.tabs ?? [], [d])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <LineChart size={20} className="text-brand" /> {d?.title || 'Overall Report Dashboard'}
        </h2>
        {d?.subtitle && <p className="mt-1 text-sm text-text-muted">{d.subtitle}</p>}
      </div>

      <RangeBar
        key={`${range.start}|${range.end}`}
        start={range.start}
        end={range.end}
        label="Date Range"
        buttonLabel="Filter"
        onApply={(start, end) => setRange({ start, end })}
        right={
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => {
              setEntity(defaults.entity)
              setWarehouse(defaults.warehouse)
              setRange({ start: defaults.start, end: defaults.end })
            }}
          >
            Clear
          </button>
        }
      >
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Entity</span>
          <select value={entity || d?.selectedEntity || ''} onChange={(e) => setEntity(e.target.value)} className={`${inputCls} min-w-40`} aria-label="Entity">
            {(d?.entities ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Warehouse</span>
          <select value={warehouse || d?.selectedWarehouse || ''} onChange={(e) => setWarehouse(e.target.value)} className={`${inputCls} min-w-40`} aria-label="Warehouse">
            {(d?.warehouses ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </RangeBar>

      {q.isLoading && <ReportLoading label="Loading the overall report…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {d && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {d.kpis.map((k, i) => (
              <KpiCard key={k.label} label={k.label} value={`${k.value} ${k.currency}`.trim()} tone={KPI_STYLE[i % KPI_STYLE.length].tone} icon={KPI_STYLE[i % KPI_STYLE.length].icon} />
            ))}
          </div>

          <TabBar tabs={d.tabs.length ? tabs.map((t) => ({ key: t.key, label: t.label })) : [{ key: 'dashboard', label: 'Dashboard' }]} value={tab} onChange={setTab} />

          <Card className="!h-auto space-y-3">
            <h3 className="text-base font-semibold text-text!">{d.paneTitle || 'Report'}</h3>
            {d.blocks.length === 0 && !q.isFetching && <p className="text-sm text-text-faint">Nothing to show for this tab and period.</p>}
            <div className="space-y-3">
              {d.blocks.map((b, i) => (
                <Block key={i} block={b} i={i} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
