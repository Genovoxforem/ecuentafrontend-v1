import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { StatsChart } from '../statsHtmlParser'

// Fixed categorical order (never reassigned by which series happens to be
// present) — matches the dataviz skill's default validated palette, slots
// 1 and 2. These stats pages show at most two series (previous/current
// year), so two slots is enough.
const SERIES_COLORS = ['#2a78d6', '#eb6834']

export function StatsBarChart({ chart }: { chart: StatsChart }) {
  const data = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    chart.datasets.forEach((ds) => {
      row[ds.label] = ds.data[i] ?? 0
    })
    return row
  })

  return (
    <div>
      <p className="text-center text-sm font-medium text-text-muted mb-2">{chart.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e5e7eb)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip />
          {chart.datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {chart.datasets.map((ds, i) => (
            <Bar key={ds.label} dataKey={ds.label} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
