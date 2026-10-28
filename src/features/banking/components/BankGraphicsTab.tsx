import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useBankStatsDay, useBankStatsMonth, type BankAccountRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Recharts v3's <Tooltip formatter> prop type is awkward to satisfy exactly
// (an intersection with a 5-arg signature) — a small custom content
// component, the same escape hatch this app's Home dashboard already uses
// (see ChartTooltip in HomeOverview.tsx), sidesteps that cleanly.
function MoneyTooltip({ active, payload, label, currencyCode }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-text mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color || entry.fill }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="font-semibold text-text tabular-nums">
            {formatMoney(Number(entry.value))} {currencyCode}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartBody({ query, height, children }: { query: { isLoading: boolean; isError: boolean; error: unknown }; height: number; children: ReactNode }) {
  if (query.isLoading) return <p className="flex items-center justify-center text-sm text-text-faint italic" style={{ height }}>Loading...</p>
  if (query.isError) return <p className="flex items-center justify-center text-sm text-danger" style={{ height }}>{query.error instanceof Error ? query.error.message : "Couldn't load the figures."}</p>
  return <>{children}</>
}

// The figures come from compta/bank/fapi/stats.php: group=day gives the balance and the movements of every day of the month
// (the balance is empty for the days to come) and group=month the movements of every month of the year. The real page's
// "Show For All Accounts" / "Show Balance From Start" links aren't reproduced — the former changes scope beyond this one
// account, the latter is already how the running balance always behaves (cumulative from account start).
export function BankGraphicsTab({ account }: { account: BankAccountRow }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [yearOffset, setYearOffset] = useState(0)

  const now = new Date()
  const viewMonthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewMonth = viewMonthDate.getMonth() + 1
  const viewMonthYear = viewMonthDate.getFullYear()
  const viewYear = now.getFullYear() + yearOffset

  const day = useBankStatsDay(account.id, viewMonthYear, viewMonth)
  const year = useBankStatsMonth(account.id, viewYear)

  const movements = (day.data?.movements ?? []).map((m) => ({ day: m.day, Credit: m.credit, Debit: m.debit }))
  const balance = (day.data?.balance ?? []).map((b) => ({ day: b.day, Balance: b.balance }))
  const yearData = (year.data ?? []).map((m) => ({ month: MONTH_NAMES[m.month - 1], Credit: m.credit, Debit: m.debit }))

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text!">
            Movements — {MONTH_NAMES[viewMonth - 1]} {viewMonthYear}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMonthOffset((o) => o - 1)} className="p-1 rounded hover:bg-surface-hover text-text-muted" title="Previous month">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => setMonthOffset((o) => o + 1)} className="p-1 rounded hover:bg-surface-hover text-text-muted" title="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <ChartBody query={day} height={220}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={movements} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
              <XAxis dataKey="day" stroke="var(--color-text-faint)" fontSize={11.55} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-faint)" fontSize={11.55} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v)} width={70} />
              <Tooltip content={<MoneyTooltip currencyCode={account.currencyCode} />} />
              <Legend wrapperStyle={{ fontSize: 12.6 }} />
              <Bar dataKey="Credit" fill="var(--color-success-fg)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Debit" fill="var(--color-danger-fg)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBody>
      </Card>

      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-3">
          Balance — {MONTH_NAMES[viewMonth - 1]} {viewMonthYear}
        </p>
        <ChartBody query={day} height={200}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={balance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
              <XAxis dataKey="day" stroke="var(--color-text-faint)" fontSize={11.55} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-faint)" fontSize={11.55} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v)} width={70} domain={['auto', 'auto']} />
              <Tooltip content={<MoneyTooltip currencyCode={account.currencyCode} />} />
              <Line type="stepAfter" dataKey="Balance" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBody>
      </Card>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text!">Movements — Year {viewYear}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setYearOffset((o) => o - 1)} className="p-1 rounded hover:bg-surface-hover text-text-muted" title="Previous year">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => setYearOffset((o) => o + 1)} className="p-1 rounded hover:bg-surface-hover text-text-muted" title="Next year">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <ChartBody query={year} height={220}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yearData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
              <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={11.55} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-faint)" fontSize={11.55} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v)} width={70} />
              <Tooltip content={<MoneyTooltip currencyCode={account.currencyCode} />} />
              <Legend wrapperStyle={{ fontSize: 12.6 }} />
              <Bar dataKey="Credit" fill="var(--color-success-fg)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Debit" fill="var(--color-danger-fg)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBody>
      </Card>
    </div>
  )
}
