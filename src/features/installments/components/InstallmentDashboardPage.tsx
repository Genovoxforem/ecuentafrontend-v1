import { useState, type ComponentType, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { AssetKpi, Cur, EmptyState, KpiRow, PageHeading } from '../../fixedAsset/components/AssetUi'
import { fmtDate, int, money } from '../../fixedAsset/assetModels'
import { isoDate } from '../../fixedAsset/assetModels'
import { useInstallmentCustomers, useInstallmentDashboard, useInstallmentTemplates, type DashboardFilter } from '../installments.data'
import { CHART_COLORS, monthLabel } from '../installmentHelpers'
import { FILTER_INPUT, FilterField, InstallmentSubNav, QueryStates } from './InstallmentUi'

const fmtAxis = (v: number) => Number(v).toLocaleString('en-US')

function ChartCard({ title, children, height = 240 }: { title: string; children: ReactNode; height?: number }) {
  return (
    <Card className="!h-auto">
      <p className="mb-2 text-sm font-bold text-text!">{title}</p>
      <div style={{ height }}>{children}</div>
    </Card>
  )
}

const tip = { formatter: (v: unknown) => money(v as number) }

// Installment dashboard (classic installment/dashboard.php): filters, 8 KPI tiles, 6 charts and the due calendar, all from
// installment/api/reports.php?action=dashboard (plans.php?action=customers|templates fill the customer and plan filters).
export function InstallmentDashboardPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [f, setF] = useState<DashboardFilter>({ from: '', to: '', customer: '', template: '', currency: '', status: '' })
  const set = (k: keyof DashboardFilter, v: string) => setF((cur) => ({ ...cur, [k]: v }))
  const customers = useInstallmentCustomers('')
  const templates = useInstallmentTemplates()
  const q = useInstallmentDashboard(f)
  const d = q.data
  const today = isoDate(new Date())

  const trendMonths = d ? Array.from(new Set([...d.trend.due, ...d.trend.collected].map((m) => m.month))).sort() : []
  const pick = (arr: Array<{ month: string; amount: number }>) => Object.fromEntries(arr.map((m) => [m.month, m.amount]))
  const dueBy = d ? pick(d.trend.due) : {}
  const colBy = d ? pick(d.trend.collected) : {}
  const trend = trendMonths.map((m) => ({ month: m, Due: dueBy[m] ?? 0, Collected: colBy[m] ?? 0 }))
  const statusData = d
    ? [
        { name: 'Paid', value: d.status.paid, color: '#12805c' },
        { name: 'Partially paid', value: d.status.partial, color: '#b45309' },
        { name: 'Pending', value: d.status.pending, color: '#3b5bdb' },
        { name: 'Overdue', value: d.status.overdue, color: '#c92a2a' },
      ]
    : []

  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="Installment dashboard">
        Collections, outstanding balances and what falls due next.
      </PageHeading>
      <InstallmentSubNav active="dashboard" />

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="From">
            <input type="date" aria-label="From" value={f.from} onChange={(e) => set('from', e.target.value)} className={FILTER_INPUT} />
          </FilterField>
          <FilterField label="To">
            <input type="date" aria-label="To" value={f.to} onChange={(e) => set('to', e.target.value)} className={FILTER_INPUT} />
          </FilterField>
          <FilterField label="Customer">
            <select aria-label="Customer" value={f.customer} onChange={(e) => set('customer', e.target.value)} className={FILTER_INPUT}>
              <option value="">All customers</option>
              {(customers.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Plan">
            <select aria-label="Plan" value={f.template} onChange={(e) => set('template', e.target.value)} className={FILTER_INPUT}>
              <option value="">All plans</option>
              {(templates.data?.items ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Currency">
            <input aria-label="Currency" placeholder="Currency" value={f.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={`${FILTER_INPUT} w-24!`} />
          </FilterField>
          <FilterField label="Status">
            <select aria-label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} className={FILTER_INPUT}>
              <option value="">Active + completed</option>
              <option value="active">active</option>
              <option value="completed">completed</option>
            </select>
          </FilterField>
        </div>
      </Card>

      <QueryStates loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} what="the installment dashboard" />

      {d && (
        <div className={`space-y-4 ${q.isPlaceholderData ? 'opacity-60' : ''}`}>
          <KpiRow>
            <AssetKpi label="Installment plans" value={int(d.kpi.plans)} />
            <AssetKpi label="Total installment amount" value={<Cur value={d.kpi.total} currency={d.currency} />} />
            <AssetKpi label="Total collected" value={<Cur value={d.kpi.collected} currency={d.currency} />} tone="ok" />
            <AssetKpi label="Total outstanding" value={<Cur value={d.kpi.outstanding} currency={d.currency} />} tone={d.kpi.outstanding ? 'warn' : 'ok'} />
            <AssetKpi label="Total overdue" value={<Cur value={d.kpi.overdue} currency={d.currency} />} note={`${int(d.kpi.overdue_installments)} installment(s)`} tone={d.kpi.overdue ? 'bad' : 'ok'} />
            <AssetKpi label="Collection rate" value={`${d.kpi.collection_rate}%`} note="collected / scheduled" />
            <AssetKpi label="Pending installments" value={int(d.kpi.pending)} note={`${int(d.kpi.partial)} partially paid`} />
            <AssetKpi label="Paid installments" value={int(d.kpi.paid)} tone="ok" />
          </KpiRow>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <ChartCard title="Monthly collection">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.monthly.map((m) => ({ month: monthLabel(m.month), Collected: m.amount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Bar dataKey="Collected" fill="#12805c" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Installment status">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="85%">
                    {statusData.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <ChartCard title="Collection trend — due vs collected">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={monthLabel} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Line type="monotone" dataKey="Due" stroke="#3b5bdb" strokeWidth={2} />
                  <Line type="monotone" dataKey="Collected" stroke="#12805c" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Outstanding aging">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(d.aging).map(([bucket, v]) => ({ bucket, Outstanding: v }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip {...tip} />
                  <Bar dataKey="Outstanding" fill="#c92a2a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Plan performance">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.performance.map((p) => ({ label: p.label, Scheduled: p.total, Collected: p.paid }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Bar dataKey="Scheduled" fill={CHART_COLORS[0]} />
                  <Bar dataKey="Collected" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top customers by outstanding">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={d.top_customers.map((c) => ({ label: c.label, Outstanding: c.amount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip {...tip} />
                  <Bar dataKey="Outstanding" fill="#b45309" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card className="!h-auto">
            <p className="text-sm font-bold text-text!">
              Due calendar <span className="font-normal text-text-muted">(last month → next 2 months)</span>
            </p>
            {d.calendar.length === 0 ? (
              <EmptyState title="Nothing due in this window" />
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {d.calendar.map((c) => {
                  const late = c.date < today
                  return (
                    <div key={c.date} className={`rounded-lg border p-3 ${late ? 'border-danger' : 'border-border'}`}>
                      <div className="text-xs text-text-muted">{fmtDate(c.date)}</div>
                      <div className="font-bold text-text!">{money(c.amount)}</div>
                      <div className="text-xs text-text-muted">
                        {c.count} installment(s){late ? ' · overdue' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
