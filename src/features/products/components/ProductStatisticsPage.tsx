import { ChartPie } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductStatsReport } from '../products.queries'
import type { ProductStatSeries } from '../productLegacyParsers'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function StatMiniChart({ series, color }: { series: ProductStatSeries; color: string }) {
  const data = series.monthly.map((v, i) => ({ month: MONTHS[i] ?? String(i + 1), value: v }))
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text!">{series.label}</h3>
        <span className="text-xs font-medium rounded-md bg-brand/10 text-brand px-2 py-0.5">{series.total}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={10} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-hover)' }}
            contentStyle={{ fontSize: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px' }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// Real usage data scraped from product/stats/card.php (no REST equivalent)
// — see productLegacyParsers.ts / useProductStatsReport. type distinguishes
// Products vs Services, confirmed to return genuinely different real
// numbers on this backend.
export function ProductStatisticsPage({ type, title }: { type: 0 | 1; title: string }) {
  const { data: series, isLoading, isError, error, refetch } = useProductStatsReport(type)

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ChartPie size={20} className="text-brand" /> {title}
      </h2>

      {isError && <LegacyErrorCard title="Couldn't load statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading real usage statistics from the legacy backend…" />}

      {series &&
        (series.length === 0 ? (
          <Card className="items-center justify-center py-10 text-center">
            <p className="text-sm text-text-faint">No usage data yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {series.map((s, i) => (
              <StatMiniChart key={s.label} series={s} color={`var(--color-chart-${(i % 8) + 1})`} />
            ))}
          </div>
        ))}
    </div>
  )
}
