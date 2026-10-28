import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useBankStatsType, type BankAccountRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'

// Same real Oper. Date range filter BankEntriesList already exposes
// (dateOpsFrom/dateOpsTo) — this just derives the calendar-month bounds so
// a click here pre-fills that filter to the clicked month, same as the real
// annuel.php page linking a month's total to its entries.
function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

// The annual grid of compta/bank/fapi/stats.php?group=type: three years (this one and the two before), twelve months,
// the debit and the credit of each, the totals of each year and the current balance.
export function BankMonthlyReportingTab({ account }: { account: BankAccountRow }) {
  const stats = useBankStatsType(account.id)

  if (stats.isLoading) return <Card className="!h-auto text-sm text-text-faint italic">Loading...</Card>
  if (stats.isError || !stats.data) return <Card className="!h-auto text-sm text-danger">{stats.error instanceof Error ? stats.error.message : "Couldn't load the monthly figures."}</Card>
  const { years, months, totals, currentBalance } = stats.data

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
            {months.map((m) => (
              <tr key={m.month} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-text-muted sticky left-0 bg-surface">{m.label}</td>
                {years.map((y) => {
                  const b = m.byYear[String(y)]
                  const { from, to } = monthRange(y, m.month)
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
            ))}
            <tr className="border-t-2 border-border font-semibold">
              <td className="px-4 py-2 text-text! sticky left-0 bg-surface">Total</td>
              {years.map((y) => {
                const t = totals[String(y)]
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
          {formatMoney(currentBalance)} {account.currencyCode}
        </span>
      </div>
    </Card>
  )
}
