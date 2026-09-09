import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { parseAmount, type BankAccountRow, type BankEntryRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseMDY(s: string): { day: number; month: number; year: number } | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return { month: Number(m[1]), day: Number(m[2]), year: Number(m[3]) }
}

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

// Real, derived from the same bankentries_list_ajax.php rows already fetched
// for the "Bank Account" tab (see BankAccountDetail.tsx) — grouped by
// day/month here instead of by payment type or year. compta/bank/graph.php
// itself has no JSON API (zero json_encode; it draws with jsflot server-side
// from its own SQL), but this re-aggregates the same real transaction data
// client-side, matching the same technique already used for Monthly
// Reporting and the Bank Account tab's own stat cards. The real page's
// "Show For All Accounts" / "Show Balance From Start" links aren't
// reproduced — the former changes scope beyond this one account, the latter
// is already how our running balance always behaves (cumulative from
// account start), so there's nothing extra to toggle for it.
export function BankGraphicsTab({ entries, account }: { entries: BankEntryRow[]; account: BankAccountRow }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [yearOffset, setYearOffset] = useState(0)

  const now = new Date()
  const viewMonthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewMonth = viewMonthDate.getMonth() + 1
  const viewMonthYear = viewMonthDate.getFullYear()
  const viewYear = now.getFullYear() + yearOffset

  const parsed = useMemo(() => entries.map((r) => ({ r, p: parseMDY(r.dateOps) })).filter((x) => x.p !== null) as { r: BankEntryRow; p: { day: number; month: number; year: number } }[], [entries])

  const monthData = useMemo(() => {
    const daysInMonth = new Date(viewMonthYear, viewMonth, 0).getDate()
    const byDay = new Map<number, { credit: number; debit: number }>()
    const balanceByDay = new Map<number, number>()
    for (const { r, p } of parsed) {
      if (p.month !== viewMonth || p.year !== viewMonthYear) continue
      const bucket = byDay.get(p.day) ?? { credit: 0, debit: 0 }
      bucket.credit += r.credit ? parseAmount(r.credit) : 0
      bucket.debit += r.debit ? parseAmount(r.debit) : 0
      byDay.set(p.day, bucket)
      // Entries arrive newest-first, so the first one seen per day is that
      // day's most recent transaction — i.e. its end-of-day balance.
      if (!balanceByDay.has(p.day)) balanceByDay.set(p.day, parseAmount(r.runningBalance))
    }
    // Seed the line with the balance carried in from the last transaction
    // before this month (parsed is newest-first, so the first entry we hit
    // that's before day 1 of this month is exactly that) — otherwise days
    // before this month's first transaction would show a gap instead of the
    // real prior balance the account actually had.
    let lastBalance: number | null = null
    for (const { r, p } of parsed) {
      if (p.year < viewMonthYear || (p.year === viewMonthYear && p.month < viewMonth)) {
        lastBalance = parseAmount(r.runningBalance)
        break
      }
    }
    const movements: { day: number; Credit: number; Debit: number }[] = []
    const balance: { day: number; Balance: number | null }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const b = byDay.get(d)
      movements.push({ day: d, Credit: b?.credit ?? 0, Debit: b?.debit ?? 0 })
      if (balanceByDay.has(d)) lastBalance = balanceByDay.get(d)!
      balance.push({ day: d, Balance: lastBalance })
    }
    return { movements, balance }
  }, [parsed, viewMonth, viewMonthYear])

  const yearData = useMemo(() => {
    const byMonth = new Map<number, { credit: number; debit: number }>()
    for (const { r, p } of parsed) {
      if (p.year !== viewYear) continue
      const bucket = byMonth.get(p.month) ?? { credit: 0, debit: 0 }
      bucket.credit += r.credit ? parseAmount(r.credit) : 0
      bucket.debit += r.debit ? parseAmount(r.debit) : 0
      byMonth.set(p.month, bucket)
    }
    return MONTH_NAMES.map((name, i) => {
      const b = byMonth.get(i + 1)
      return { month: name, Credit: b?.credit ?? 0, Debit: b?.debit ?? 0 }
    })
  }, [parsed, viewYear])

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
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthData.movements} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
            <XAxis dataKey="day" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v)} width={70} />
            <Tooltip content={<MoneyTooltip currencyCode={account.currencyCode} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Credit" fill="var(--color-success-fg)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Debit" fill="var(--color-danger-fg)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-3">
          Balance — {MONTH_NAMES[viewMonth - 1]} {viewMonthYear}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthData.balance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
            <XAxis dataKey="day" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v)} width={70} domain={['auto', 'auto']} />
            <Tooltip content={<MoneyTooltip currencyCode={account.currencyCode} />} />
            <Line type="stepAfter" dataKey="Balance" stroke="var(--color-brand)" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
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
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={yearData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
            <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v)} width={70} />
            <Tooltip content={<MoneyTooltip currencyCode={account.currencyCode} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Credit" fill="var(--color-success-fg)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Debit" fill="var(--color-danger-fg)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
