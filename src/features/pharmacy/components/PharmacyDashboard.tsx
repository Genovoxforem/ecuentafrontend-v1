import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { kwacha } from '../pharmacyFormat'
import { usePharmacyPrescriptions, usePharmacyReport, usePharmacySummary, usePharmacyValuation } from '../pharmacy.queries'
import { PHARMACY_FISCAL_STATUSES, type PharmacyReportAnswer, type PharmacyReportColumn, type PharmacyReportParams } from '../pharmacyReports'
import { DataTable, Panel, Pill, Status, Tile } from './PharmacyUi'

// The classic Dashboard. In the classic app only four counts are live (reports/summary: Prescriptions, Near-expiry,
// Low stock, pending Rx); its Sales today, Expiry runway, Controlled register and Top movers carry a "sample" badge there
// and are hard-coded figures. Here each of them is read from the real reports endpoint instead (the same self-describing
// api.php?m=reports&action=<report> answers the Reports page uses), over today / the next 90 days / the last 7 days.
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return iso(d)
}
const params = (view: string, from: string, to: string, over: Partial<PharmacyReportParams> = {}): PharmacyReportParams => ({
  view,
  from,
  to,
  branch: '',
  medicine: '',
  payment: '',
  statuses: [...PHARMACY_FISCAL_STATUSES],
  sort: '',
  dir: 'desc',
  page: 1,
  page_size: 100,
  ...over,
})

// "K 41k", "K 1.7M" like the classic runway labels.
const compact = (v: number) => (v >= 1e6 ? `K ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `K ${Math.round(v / 1e3)}k` : kwacha(v))

const BUCKETS: { label: string; from: number; to: number; color: string }[] = [
  { label: '0–30 days', from: 0, to: 30, color: 'bg-danger-fg' },
  { label: '31–60 days', from: 31, to: 60, color: 'bg-warning-fg' },
  { label: '61–90 days', from: 61, to: 90, color: 'bg-warning-fg' },
]
const money = (v: unknown) => Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0

// Stock value at risk by days to expiry, from the near_expiry report (columns days + value). That report only lists lots
// expiring within 90 days (or already expired), so the "over 90 days" row is derived: the stock valuation total less the
// value of every lot the report lists ("Value at risk"). It is only as exact as those two figures are comparable.
function ExpiryRunway() {
  const { data, isLoading, error } = usePharmacyReport('near_expiry', params('detail', daysAgo(0), daysAgo(0)))
  const valuation = usePharmacyValuation()
  const rows = data?.rows ?? []
  const totals = BUCKETS.map((b) => rows.filter((r) => Number(r.days) >= b.from && Number(r.days) <= b.to).reduce((s, r) => s + Number(r.value ?? 0), 0))
  const atRisk = data?.metrics.find((m) => /value at risk/i.test(m.label)) ? money(data.metrics.find((m) => /value at risk/i.test(m.label))?.value) : rows.reduce((s, r) => s + Number(r.value ?? 0), 0)
  const over90 = valuation.data ? Math.max(0, valuation.data.total - atRisk) : null
  const bars = [...BUCKETS.map((b, i) => ({ label: b.label, color: b.color, value: totals[i] })), { label: 'over 90 days', color: 'bg-success-fg', value: over90 ?? 0 }]
  const max = Math.max(...bars.map((b) => b.value), 0)
  const within90 = totals.reduce((s, v) => s + v, 0)
  return (
    <Panel title="Expiry runway" sub="Stock value reaching expiry, next 90 days" right={<Pill tone="ok">live</Pill>}>
      <Status loading={isLoading} error={error ?? valuation.error} />
      {data && (
        <div className="space-y-3 px-5 py-4">
          {within90 === 0 && <p className="text-sm text-text-faint">No lots reach expiry in the next 90 days.</p>}
          {bars.map((b) => (
            <div key={b.label} className="grid grid-cols-[4.2rem_1fr_3.5rem] items-center gap-3 text-sm">
              <span className="text-text-muted">{b.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                <div className={`h-full rounded-full ${b.color}`} style={{ width: max ? `${(b.value / max) * 100}%` : 0 }} />
              </div>
              <span className="text-right font-bold tabular-nums text-text!">{b.label === 'over 90 days' && over90 === null ? '-' : compact(b.value)}</span>
            </div>
          ))}
          <p className="text-xs text-text-faint">Over 90 days = stock valuation less the lots above (derived).{data.pages > 1 ? ` Lots listed: first ${data.page_size} of ${data.total_rows}.` : ''}</p>
        </div>
      )}
    </Panel>
  )
}

const cellText = (c: PharmacyReportColumn, v: unknown) => (v === null || v === undefined || v === '' ? '' : c.money ? kwacha(Number(v)) : String(v))

// A ranked list built from whatever columns the report answer declares: first text column = title, the next text columns
// = the small line, and the value column (valueKey, else the first numeric one) on the right.
function RankedList({ data, valueKey, limit }: { data: PharmacyReportAnswer; valueKey?: string; limit: number }) {
  const text = data.columns.filter((c) => !c.num && !c.status)
  const title = text[0]
  const subs = text.slice(1, 4)
  const value = data.columns.find((c) => c.key === valueKey) ?? data.columns.find((c) => c.num)
  return (
    <ul>
      {data.rows.slice(0, limit).map((r, i) => (
        <li key={i} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-success-bg text-xs font-bold text-success-fg">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text!">{title ? cellText(title, r[title.key]) : '-'}</p>
            <p className="truncate text-xs text-text-faint">{subs.map((c) => cellText(c, r[c.key])).filter(Boolean).join(' · ')}</p>
          </div>
          {value && <span className="font-bold tabular-nums text-text!">{cellText(value, r[value.key])}</span>}
        </li>
      ))}
    </ul>
  )
}

function ControlledRegister() {
  const today = daysAgo(0)
  const { data, isLoading, error } = usePharmacyReport('controlled_movements', params('detail', today, today, { page_size: 5 }))
  return (
    <Panel title="Controlled register" sub="Schedule drugs dispensed today" right={data && <Pill tone="ok">{data.total_rows} today</Pill>}>
      <Status loading={isLoading} error={error} empty={data?.rows.length === 0} emptyText="No controlled dispenses today." />
      {data && data.rows.length > 0 && <RankedList data={data} limit={5} />}
    </Panel>
  )
}

function TopMovers() {
  const { data, isLoading, error } = usePharmacyReport('medicine_sales', params('by_medicine', daysAgo(6), daysAgo(0), { sort: 'total', page_size: 4 }))
  return (
    <Panel title="Top movers" sub="Last 7 days by value">
      <Status loading={isLoading} error={error} empty={data?.rows.length === 0} emptyText="No sales in the last 7 days." />
      {data && data.rows.length > 0 && <RankedList data={data} valueKey="total" limit={4} />}
    </Panel>
  )
}

export function PharmacyDashboard() {
  const summary = usePharmacySummary()
  const rx = usePharmacyPrescriptions()
  const sales = usePharmacyReport('medicine_sales', params('detail', daysAgo(0), daysAgo(0), { page_size: 1 }))
  const s = summary.data
  const salesToday = sales.data?.metrics.find((m) => m.label.toLowerCase() === 'total')?.value
  const pending = (rx.data ?? []).filter((r) => r.status !== 'dispensed' && r.status !== 'collected' && r.status !== 'declined')

  return (
    <div className="space-y-5">
      <Status error={summary.error} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Sales today" value={salesToday ?? '-'} note="POS revenue" />
        <Tile label="Prescriptions" value={s?.scripts_total ?? '-'} note={`${s?.pending_rx ?? 0} pending`} />
        <Tile label="Near-expiry" value={s?.near_expiry ?? '-'} pill="action" note="within 90 days" tone="warn" />
        <Tile label="Low stock" value={s?.low_stock ?? '-'} pill="reorder" note="below level" tone="bad" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <ExpiryRunway />
        <ControlledRegister />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <TopMovers />
        <Panel title="Pending prescriptions" sub="Awaiting verification / dispense" right={<Link to={ROUTES.pharmacyPrescriptions} className="text-xs text-brand hover:underline">All prescriptions</Link>}>
          <Status loading={rx.isLoading} error={rx.error} empty={rx.data && pending.length === 0} emptyText="No pending prescriptions." />
          {pending.length > 0 && (
            <DataTable
              rows={pending}
              rowKey={(r) => r.id}
              columns={[
                { header: 'Patient', cell: (r) => <><span className="font-semibold text-text!">{r.patient}</span><span className="block text-xs text-text-faint">{r.ref} · {r.prescriber}</span></> },
                { header: 'Status', cell: (r) => <Pill tone="warn">{r.status}</Pill> },
              ]}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}
