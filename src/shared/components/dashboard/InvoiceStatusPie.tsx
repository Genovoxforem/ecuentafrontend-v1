import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { InvoiceStatusRow } from './DashboardKit'

// The only recharts code in DashboardKit, kept in its own file so DashboardKit can load it on demand. DashboardKit is used by
// almost every page, and importing recharts there put the whole charts library (about 420 KB) into the first load of each one.
export default function InvoiceStatusPie({ rows }: { rows: InvoiceStatusRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {rows.map((row, i) => (
            <Cell key={row.status} fill={`var(--color-chart-${(i % 8) + 1})`} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
