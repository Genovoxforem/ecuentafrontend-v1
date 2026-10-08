import { useQuery } from '@tanstack/react-query'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '../../../utils/format'
import { MONTHS, num, pv2Get } from '../payrollV2.api'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, TablePanel, Td, Th } from './PayrollV2Chrome'

interface TrendRow {
  period_month: string
  gross: string
  net: string
  paye: string
  napsa: string
  nhima: string
}

interface DepartmentRow {
  department: string | null
  grade: string | null
  total_gross: string | null
  headcount: string | null
}

// reports.php analytics_trend / analytics_department — the two panels the
// classic Analytics tab draws.
export function PayrollAnalytics() {
  const trend = useQuery({
    queryKey: ['payroll-v2', 'analytics', 'trend'],
    queryFn: () => pv2Get<TrendRow[]>('reports.php', 'analytics_trend'),
  })
  const departments = useQuery({
    queryKey: ['payroll-v2', 'analytics', 'department'],
    queryFn: () => pv2Get<DepartmentRow[]>('reports.php', 'analytics_department'),
  })

  const chartData = (trend.data ?? []).map((row) => ({
    month: MONTHS[num(row.period_month)] ?? row.period_month,
    Gross: num(row.gross),
    Net: num(row.net),
    PAYE: num(row.paye),
  }))

  return (
    <div className="space-y-4">
      {trend.isError && <ErrorCard error={trend.error} onRetry={() => trend.refetch()} />}

      <PanelCard title="Payroll Cost Trend (YTD)">
        {trend.isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {!trend.isLoading && chartData.length === 0 && <p className="text-sm text-text-faint italic">No posted pay runs yet this year.</p>}
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} width={76} tickFormatter={(value: number) => formatMoney(value)} />
              <Tooltip formatter={(value) => formatMoney(num(value))} contentStyle={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Gross" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Net" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="PAYE" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </PanelCard>

      <TablePanel title="Gross Salary by Grade (This Month)">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Department / Grade</Th>
              <Th className="text-right">Headcount</Th>
              <Th className="text-right">Total Gross</Th>
            </tr>
          </thead>
          <tbody>
            {departments.isLoading && <LoadingRows cols={3} />}
            {!departments.isLoading && (departments.data ?? []).length === 0 && <EmptyRow colSpan={3} label="No pay run data yet for this month." />}
            {(departments.data ?? []).map((row, index) => (
              <tr key={`${row.department ?? row.grade ?? index}`} className="border-t border-border">
                <Td>{row.department || row.grade || '—'}</Td>
                <Td className="text-right tabular-nums">{row.headcount ?? '—'}</Td>
                <Td className="text-right tabular-nums">{row.total_gross ? formatMoney(num(row.total_gross)) : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}
