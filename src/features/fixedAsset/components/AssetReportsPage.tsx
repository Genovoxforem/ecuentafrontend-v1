import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { downloadSemicolonCsv } from '../../../utils/csvDownload'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useAssetOptions } from '../assetList.data'
import { useForecastReport, useInsuranceReport, useReconcileReport, useRegisterReport, useRollForwardReport } from '../assetReports.data'
import { fmtDate, int, isoDate, money } from '../assetModels'
import { AssetKpi, Badge, Banner, Cur, EmptyState, KpiRow, LineChart, PageHeading, AssetSubNav, ClassicViewLink } from './AssetUi'
import { assetViewPath, GHOST_BTN, TD, TDR, TH, THR } from '../assetUiHelpers'

type Tab = 'register' | 'rollforward' | 'forecast' | 'insurance' | 'reconcile'
const TABS: Array<[Tab, string]> = [['register', 'Register'], ['rollforward', 'Roll-forward'], ['forecast', 'Forecast'], ['insurance', 'Insurance'], ['reconcile', 'Ledger reconciliation']]

interface Col<R> {
  key: string
  header: string
  num?: boolean
  render?: (value: unknown, row: R) => ReactNode
}

// One report table as the classic page draws it: a row count, a CSV button, the rows, and a Total row when the answer has totals.
function ReportTable<R extends object>({ cols, rows, foot, file }: { cols: Array<Col<R>>; rows: R[]; foot?: Record<string, unknown> | null; file: string }) {
  const get = (r: R, k: string) => (r as Record<string, unknown>)[k]
  return (
    <Card className="!h-auto !p-0">
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-sm text-text-muted">{int(rows.length)} row(s)</span>
        <button
          type="button"
          className={GHOST_BTN}
          onClick={() =>
            downloadSemicolonCsv(
              file,
              cols.map((c) => [c.key, c.header]),
              rows as unknown as Array<Record<string, unknown>>,
            )
          }
        >
          <Download size={14} /> CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing to show" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {cols.map((c) => (
                  <th key={c.key} className={c.num ? THR : TH}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {cols.map((c) => {
                    const v = get(r, c.key)
                    return (
                      <td key={c.key} className={c.num ? TDR : TD}>
                        {c.render ? c.render(v, r) : c.num ? money(v as number) : v === null || v === undefined ? '' : String(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            {foot && (
              <tfoot>
                <tr className="border-t border-border font-bold">
                  {cols.map((c, i) => (
                    <td key={c.key} className={c.num ? TDR : TD}>
                      {i === 0 ? 'Total' : c.num && foot[c.key] != null ? money(foot[c.key] as number) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </Card>
  )
}

const assetLink = (id: number | undefined) => (value: unknown) =>
  id ? (
    <Link to={assetViewPath(id)} className="font-semibold text-brand hover:underline">
      {String(value)}
    </Link>
  ) : (
    String(value)
  )

function Status({ query }: { query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown } }) {
  if (query.isLoading) return <LegacyLoadingCard label="Loading the report…" />
  if (query.isError) return <LegacyErrorCard title="Couldn't load the report" message={query.error instanceof Error ? query.error.message : 'Unknown error.'} onRetry={() => query.refetch()} />
  return null
}

function ParamField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="inline-flex max-w-[200px] flex-col gap-1 text-sm text-text">
      {label}
      {children}
    </label>
  )
}

function RegisterTab({ currency }: { currency?: string }) {
  const [asOf, setAsOf] = useState(() => isoDate(new Date()))
  const q = useRegisterReport(asOf)
  const d = q.data
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <ParamField label="As of">
          <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} className={inputClasses} />
        </ParamField>
      </Card>
      <Status query={q} />
      {d && (
        <>
          <KpiRow>
            <AssetKpi label="Cost" value={<Cur value={d.totals.cost} currency={currency} />} />
            <AssetKpi label="Accumulated depreciation" value={<Cur value={d.totals.accumulated} currency={currency} />} />
            <AssetKpi label="Net book value" value={<Cur value={d.totals.nbv} currency={currency} />} note={`as of ${fmtDate(d.as_of)}`} tone="ok" />
          </KpiRow>
          <ReportTable
            file={`asset-register-${d.as_of}.csv`}
            foot={d.totals}
            rows={d.rows}
            cols={[
              { key: 'ref', header: 'Ref', render: (v, r) => assetLink(r.id)(v) },
              { key: 'label', header: 'Asset' },
              { key: 'type', header: 'Type' },
              { key: 'group', header: 'Group' },
              { key: 'location', header: 'Location' },
              { key: 'acquired', header: 'Acquired', render: (v) => fmtDate(v as string) },
              { key: 'cost', header: 'Cost', num: true },
              { key: 'accumulated', header: 'Accumulated', num: true },
              { key: 'nbv', header: 'NBV', num: true },
            ]}
          />
        </>
      )}
    </div>
  )
}

function RollForwardTab() {
  const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [to, setTo] = useState(() => isoDate(new Date()))
  const q = useRollForwardReport(from, to)
  const d = q.data
  return (
    <div className="space-y-4">
      <Card className="!h-auto flex-row flex-wrap gap-3">
        <ParamField label="From">
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className={inputClasses} />
        </ParamField>
        <ParamField label="To">
          <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className={inputClasses} />
        </ParamField>
      </Card>
      <Status query={q} />
      {d && (
        <ReportTable
          file={`asset-rollforward-${d.from}-${d.to}.csv`}
          foot={d.totals}
          rows={d.rows}
          cols={[
            { key: 'type', header: 'Type' },
            { key: 'cost_open', header: 'Cost b/f', num: true },
            { key: 'additions', header: 'Additions', num: true },
            { key: 'disposals_cost', header: 'Disposals', num: true },
            { key: 'cost_close', header: 'Cost c/f', num: true },
            { key: 'acc_open', header: 'Dep. b/f', num: true },
            { key: 'additions_acc', header: 'Dep. taken on', num: true },
            { key: 'charge', header: 'Charge', num: true },
            { key: 'disposals_acc', header: 'Dep. on disposals', num: true },
            { key: 'acc_close', header: 'Dep. c/f', num: true },
            { key: 'nbv_close', header: 'NBV c/f', num: true },
          ]}
        />
      )}
    </div>
  )
}

function ForecastTab({ currency }: { currency?: string }) {
  const [months, setMonths] = useState('12')
  const n = Number(months)
  const q = useForecastReport(n > 0 ? n : 0)
  const d = q.data
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <ParamField label="Months ahead">
          <input type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)} className={inputClasses} />
        </ParamField>
      </Card>
      <Status query={q} />
      {d && (
        <>
          <Card className="!h-auto">
            <LineChart labels={d.months.map((m) => m.period)} series={[{ name: 'Planned depreciation', color: 'var(--color-brand)', values: d.months.map((m) => m.amount) }]} height={200} />
          </Card>
          <KpiRow>
            <AssetKpi label={`Next ${d.months.length} months`} value={<Cur value={d.total} currency={currency} />} note="planned charge" />
          </KpiRow>
          <ReportTable file="asset-forecast.csv" foot={{ amount: d.total }} rows={d.months} cols={[{ key: 'period', header: 'Month' }, { key: 'amount', header: 'Planned', num: true }]} />
          <ReportTable file="asset-forecast-by-type.csv" rows={d.by_type} cols={[{ key: 'type', header: 'Type' }, { key: 'amount', header: 'Planned', num: true }]} />
        </>
      )}
    </div>
  )
}

function InsuranceTab() {
  const [days, setDays] = useState('60')
  const n = Number(days)
  const q = useInsuranceReport(days !== '' && n >= 0 ? n : -1)
  const d = q.data
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <ParamField label="Expiring within (days)">
          <input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} className={inputClasses} />
        </ParamField>
      </Card>
      <Status query={q} />
      {d && (
        <>
          <KpiRow>
            <AssetKpi label="Expiring / expired" value={int(d.expiring.length)} note={`within ${d.days} days`} tone={d.expiring.length ? 'warn' : 'ok'} />
            <AssetKpi label="Uninsured in service" value={int(d.uninsured.length)} tone={d.uninsured.length ? 'bad' : 'ok'} />
          </KpiRow>
          <ReportTable
            file="asset-insurance-expiring.csv"
            rows={d.expiring}
            cols={[
              { key: 'ref', header: 'Asset', render: (v, r) => assetLink(r.id ?? r.asset_id)(v) },
              { key: 'label', header: 'Name' },
              { key: 'insurer', header: 'Insurer' },
              { key: 'policy_no', header: 'Policy' },
              {
                key: 'end',
                header: 'Ends',
                render: (v, r) => (
                  <>
                    {fmtDate(v as string)} {r.expired && <Badge tone="bad">Expired</Badge>}
                  </>
                ),
              },
              { key: 'cover', header: 'Cover', num: true },
            ]}
          />
          <ReportTable file="asset-uninsured.csv" rows={d.uninsured} cols={[{ key: 'ref', header: 'Uninsured asset', render: (v, r) => assetLink(r.asset_id)(v) }, { key: 'label', header: 'Name' }]} />
        </>
      )}
    </div>
  )
}

function ReconcileTab() {
  const q = useReconcileReport()
  const d = q.data
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <p className="text-sm text-text-muted">Compares the asset subledger with the general-ledger balance of each asset account.</p>
      </Card>
      <Status query={q} />
      {d && (
        <>
          <Banner>{d.note}</Banner>
          <ReportTable
            file="asset-reconciliation.csv"
            rows={d.rows}
            cols={[
              { key: 'account', header: 'Account' },
              { key: 'subledger', header: 'Asset subledger', num: true },
              { key: 'ledger', header: 'General ledger', num: true },
              { key: 'difference', header: 'Difference', num: true, render: (v) => (Math.abs(Number(v)) < 0.005 ? <Badge tone="ok">0.00</Badge> : <Badge tone="bad">{money(v as number)}</Badge>) },
            ]}
          />
        </>
      )}
    </div>
  )
}

// Asset reports (classic asset/reports.php): register, roll-forward, forecast, insurance and ledger reconciliation, each a read of
// asset/api/reports.php?action=… with its own parameter; the open tab is kept in the address (?tab=).
export function AssetReportsPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as Tab | null
  const tab: Tab = useMemo(() => (TABS.some(([t]) => t === requested) ? (requested as Tab) : 'register'), [requested])
  const currency = useAssetOptions().data?.currency
  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="Asset reports" action={<ClassicViewLink view="list" />}>
        Register, roll-forward, forecast, insurance and ledger reconciliation.
      </PageHeading>
      <AssetSubNav group="main" active="reports" />
      <nav aria-label="Reports" className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => setParams({ tab: t }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'register' && <RegisterTab currency={currency} />}
      {tab === 'rollforward' && <RollForwardTab />}
      {tab === 'forecast' && <ForecastTab currency={currency} />}
      {tab === 'insurance' && <InsuranceTab />}
      {tab === 'reconcile' && <ReconcileTab />}
    </div>
  )
}
