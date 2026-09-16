import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { parseAmount, type BankAccountRow, type BankEntryRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Same real Oper. Date range filter BankEntriesList already exposes
// (dateOpsFrom/dateOpsTo, backed by bankentries_list_ajax.php's confirmed
// search_start_dt*/search_end_dt* params) — this just derives the calendar-
// month bounds so a click here pre-fills that filter to the clicked month,
// same as the real annuel.php page linking a month's total to its entries.
function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

// dateOps/dateValue come from bankentries_list_ajax.php as dol_print_date(...,
// 'day') strings — MM/DD/YYYY in this locale (matches todayMDY() in
// BankAccountDetail.tsx).
function parseMDY(s: string): { month: number; year: number } | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return { month: Number(m[1]), year: Number(m[3]) }
}

// Real, derived from the same bankentries_list_ajax.php rows already
// fetched for the "Bank Account" tab's own stats (see BankAccountDetail.tsx)
// — grouped by year/month here instead of by payment type. compta/bank/
// annuel.php itself has no JSON API (zero json_encode), but this is the same
// underlying real transaction data, just re-aggregated client-side — not a
// scrape, not fabricated.
export function BankMonthlyReportingTab({ entries, account }: { entries: BankEntryRow[]; account: BankAccountRow }) {
  const { years, grid, totals } = useMemo(() => {
    const g = new Map<number, Map<number, { debit: number; credit: number }>>()
    for (const r of entries) {
      const parsed = parseMDY(r.dateOps)
      if (!parsed) continue
      const yearMap = g.get(parsed.year) ?? new Map<number, { debit: number; credit: number }>()
      const bucket = yearMap.get(parsed.month) ?? { debit: 0, credit: 0 }
      bucket.debit += r.debit ? parseAmount(r.debit) : 0
      bucket.credit += r.credit ? parseAmount(r.credit) : 0
      yearMap.set(parsed.month, bucket)
      g.set(parsed.year, yearMap)
    }
    const ys = g.size > 0 ? Array.from(g.keys()).sort((a, b) => a - b) : [new Date().getFullYear()]
    const t = new Map<number, { debit: number; credit: number }>()
    for (const y of ys) {
      const yearMap = g.get(y)
      let debit = 0
      let credit = 0
      if (yearMap) for (const b of yearMap.values()) { debit += b.debit; credit += b.credit }
      t.set(y, { debit, credit })
    }
    return { years: ys, grid: g, totals: t }
  }, [entries])

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left font-medium text-text-faint sticky left-0 bg-surface">Month</th>
              {years.map((y) => (
                <th key={y} colSpan={2} className="px-4 py-2.5 text-center font-bold text-text! border-l border-border">
                  {y}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border">
              <th className="px-4 py-1.5 sticky left-0 bg-surface" />
              {years.map((y) => (
                <Fragment key={y}>
                  <th className="px-4 py-1.5 text-right text-xs font-medium text-text-faint border-l border-border">Debit</th>
                  <th className="px-4 py-1.5 text-right text-xs font-medium text-text-faint">Credit</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTH_NAMES.map((name, i) => {
              const month = i + 1
              return (
                <tr key={name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text-muted sticky left-0 bg-surface">{name}</td>
                  {years.map((y) => {
                    const b = grid.get(y)?.get(month)
                    const { from, to } = monthRange(y, month)
                    const monthLink = `${ROUTES.bankingEntries}?account=${account.id}&dateOpsFrom=${from}&dateOpsTo=${to}`
                    return (
                      <Fragment key={y}>
                        <td className="px-4 py-2 text-right text-danger border-l border-border">
                          {b?.debit ? (
                            <Link to={monthLink} className="hover:underline">
                              {formatMoney(b.debit)}
                            </Link>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-success-fg">
                          {b?.credit ? (
                            <Link to={monthLink} className="hover:underline">
                              {formatMoney(b.credit)}
                            </Link>
                          ) : (
                            ''
                          )}
                        </td>
                      </Fragment>
                    )
                  })}
                </tr>
              )
            })}
            <tr className="border-t-2 border-border font-semibold">
              <td className="px-4 py-2 text-text! sticky left-0 bg-surface">Total</td>
              {years.map((y) => {
                const t = totals.get(y)
                return (
                  <Fragment key={y}>
                    <td className="px-4 py-2 text-right text-danger border-l border-border">{formatMoney(t?.debit ?? 0)}</td>
                    <td className="px-4 py-2 text-right text-success-fg">{formatMoney(t?.credit ?? 0)}</td>
                  </Fragment>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-hover">
        <span className="text-sm font-semibold text-text!">Current Balance</span>
        <span className="text-sm font-bold text-brand">
          {formatMoney(account.balance)} {account.currencyCode}
        </span>
      </div>
    </Card>
  )
}
