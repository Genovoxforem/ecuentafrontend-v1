import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { StatsChart } from '../statsHtmlParser'

// Fixed categorical order (never reassigned by which series happens to be
// present) — matches the dataviz skill's default validated palette, slots
// 1 and 2. These stats pages show at most two series (previous/current
// year), so two slots is enough.
const SERIES_COLORS = ['#2a78d6', '#eb6834']
const STATUS_COLORS = ['#168bff', '#13c8a3', '#f5b942', '#a76bf5', '#f04e78', '#68a9dc']

export function StatsBarChart({ chart }: { chart: StatsChart }) {
  const data = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    chart.datasets.forEach((ds) => {
      row[ds.label] = ds.data[i] ?? 0
    })
    return row
  })

  if (chart.type === 'pie' || chart.type === 'doughnut') {
    const values = chart.datasets[0]?.data ?? []
    const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0)
    let cursor = 0
    const segments = values.map((value, index) => {
      const start = cursor
      cursor += total > 0 ? (Math.max(value, 0) / total) * 100 : 0
      return `${STATUS_COLORS[index % STATUS_COLORS.length]} ${start}% ${cursor}%`
    })
    const gradient = total > 0 ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(var(--color-border) 0% 100%)'

    return (
      <div>
        <p className="mb-3 text-sm font-medium text-text-muted">{chart.title}</p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: gradient }}>
            <div className={`absolute inset-5 grid place-content-center rounded-full bg-surface-alt text-center ${chart.type === 'pie' ? 'hidden' : ''}`}>
              <span className="text-lg font-bold text-text!">{total.toLocaleString()}</span>
              <span className="text-[10px] text-text-faint">Total amount</span>
            </div>
          </div>
          <div className="min-w-[180px] flex-1 space-y-2">
            {chart.labels.map((label, index) => {
              const value = values[index] ?? 0
              const percent = total > 0 ? Math.round((value / total) * 100) : 0
              return (
                <div key={`${label}-${index}`} className="grid grid-cols-[8px_minmax(0,1fr)_auto_auto] items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                  <span className="truncate text-text-muted" title={label}>{label}</span>
                  <span className="tabular-nums text-text!">{value.toLocaleString()}</span>
                  <span className="w-8 text-right text-text-faint">{percent}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

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
