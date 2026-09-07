import { useMemo, useState } from 'react'
import { BarChart3, Users, Tags } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllExpenseReports } from '../expenses.queries'
import { formatMoney } from '../../../utils/format'

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}
function parseListDate(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const inputCls = 'h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none'

// Real via expense/ajax/expense_list.php (length=-1) — "By Employee" is
// computed client-side from these real rows (count/HT/VAT/TTC/paid TTC per
// user), matching the real reports.php table's own columns. "By Expense
// Type" needs per-line-item amounts this backend has no JSON API for (only
// server-rendered HTML) — shown as an honest empty state. The real page's
// Department/Branch filters aren't offered here for the same reason: the
// List endpoint doesn't expose those columns at all.
export function ExpenseReportsPage() {
  const currentYear = new Date().getFullYear()
  const [yearFrom, setYearFrom] = useState(String(currentYear))
  const [yearTo, setYearTo] = useState(String(currentYear))
  const { data, isLoading, isError, error, refetch } = useAllExpenseReports()
  const rows = useMemo(() => data?.rows ?? [], [data])

  const filtered = useMemo(() => {
    const from = Number(yearFrom)
    const to = Number(yearTo)
    return rows.filter((r) => {
      const d = parseListDate(r.dateStart)
      if (!d) return true
      return d.getFullYear() >= from && d.getFullYear() <= to
    })
  }, [rows, yearFrom, yearTo])

  const byEmployee = useMemo(() => {
    const map = new Map<string, { employee: string; count: number; ht: number; tva: number; ttc: number; paidTtc: number }>()
    for (const r of filtered) {
      const key = r.user || 'Unknown'
      const bucket = map.get(key) ?? { employee: key, count: 0, ht: 0, tva: 0, ttc: 0, paidTtc: 0 }
      bucket.count += 1
      bucket.ht += parseAmount(r.totalHt)
      bucket.tva += parseAmount(r.totalTva)
      bucket.ttc += parseAmount(r.totalTtc)
      if (r.paid) bucket.paidTtc += parseAmount(r.totalTtc)
      map.set(key, bucket)
    }
    return Array.from(map.values()).sort((a, b) => b.ttc - a.ttc)
  }, [filtered])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Expense Reports
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Year From</label>
            <input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${inputCls} w-28`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Year To</label>
            <input value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${inputCls} w-28`} />
          </div>
        </div>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading expense reports…" />}
      {isError && <LegacyErrorCard title="Couldn't load expense reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <Card className="!h-auto !p-0 overflow-x-auto">
            <h3 className="flex items-center gap-2 font-semibold text-text! p-4 pb-0">
              <Users size={16} className="text-brand" /> By Employee
            </h3>
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2">Employee</th>
                  <th className="font-medium px-4 py-2 text-right">Count</th>
                  <th className="font-medium px-4 py-2 text-right">Total HT</th>
                  <th className="font-medium px-4 py-2 text-right">VAT</th>
                  <th className="font-medium px-4 py-2 text-right">Total TTC</th>
                  <th className="font-medium px-4 py-2 text-right">Paid TTC</th>
                </tr>
              </thead>
              <tbody>
                {byEmployee.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                      No expense reports in this range.
                    </td>
                  </tr>
                ) : (
                  byEmployee.map((row) => (
                    <tr key={row.employee} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-text!">{row.employee}</td>
                      <td className="px-4 py-2 text-right text-text-muted">{row.count}</td>
                      <td className="px-4 py-2 text-right text-text-muted">{formatMoney(row.ht)}</td>
                      <td className="px-4 py-2 text-right text-text-muted">{formatMoney(row.tva)}</td>
                      <td className="px-4 py-2 text-right text-text! font-medium">{formatMoney(row.ttc)}</td>
                      <td className="px-4 py-2 text-right text-success-fg">{formatMoney(row.paidTtc)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <Card className="!h-auto">
            <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
              <Tags size={16} className="text-brand" /> By Expense Type
            </h3>
            <div className="min-h-40 flex flex-col items-center justify-center text-center gap-1 py-6">
              <p className="text-sm text-text-muted">Not available</p>
              <p className="text-xs text-text-faint max-w-[260px]">This backend has no JSON API for per-line expense-type amounts — only server-rendered HTML.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
