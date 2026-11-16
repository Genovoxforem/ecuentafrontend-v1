import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt } from '../reportFormat'

// "Daily Sales Trend" of the Monthly Statement: one bar per day, the invoiced total incl. tax of that day.
export default function StatementSalesChart({ data }: { data: Array<{ day: number; total: number }> }) {
  return (
    <div className="h-56" role="img" aria-label="Daily sales trend">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} width={70} />
          <Tooltip formatter={(v) => fmt(v as number)} labelFormatter={(d) => `Day ${d}`} />
          <Bar dataKey="total" name="Daily Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
