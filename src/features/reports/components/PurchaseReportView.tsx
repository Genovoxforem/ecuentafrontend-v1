import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBarChart, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { usePurchaseReport } from '../reports.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Real via compta/resultat/purchase_report.php — see reports.queries.ts for
// the full evidence trail. The legacy page fetches expense totals too but
// never actually renders an expense line-item table (only the sum feeds
// the stat card) — mirrored here as-is rather than inventing a table the
// real page doesn't have.
export function PurchaseReportView() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const { data, isLoading, isError, error, refetch } = usePurchaseReport(dateFrom, dateTo)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBarChart size={20} className="text-brand" /> Purchase Report
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} title="From" />
        <span className="text-text-faint text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} title="To" />
      </div>

      {isLoading && <LegacyLoadingCard label="Generating report…" />}
      {isError && <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="!h-auto flex items-center gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-success-bg text-success-fg">
                <TrendingUp size={18} />
              </span>
              <div>
                <p className="text-xs text-text-faint">Total Income</p>
                <p className="font-semibold text-text!">{formatMoney(data.totalIncome)}</p>
              </div>
            </Card>
            <Card className="!h-auto flex items-center gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-danger-bg text-danger-fg">
                <TrendingDown size={18} />
              </span>
              <div>
                <p className="text-xs text-text-faint">Total Expenses</p>
                <p className="font-semibold text-text!">{formatMoney(data.totalExpense)}</p>
              </div>
            </Card>
            <Card className="!h-auto flex items-center gap-3">
              <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${data.netProfitLoss >= 0 ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>
                <Scale size={18} />
              </span>
              <div>
                <p className="text-xs text-text-faint">Net Profit/Loss</p>
                <p className="font-semibold text-text!">{formatMoney(data.netProfitLoss)}</p>
              </div>
            </Card>
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Vendor</th>
                  <th className="font-medium px-3 py-2">Ref. Vendor</th>
                  <th className="font-medium px-3 py-2">Invoice Date</th>
                  <th className="font-medium px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-text-faint italic">
                      No purchase invoices found for the selected period.
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{inv.ref}</td>
                      <td className="px-3 py-2 text-text-muted">
                        <Link to={`${ROUTES.customerDetail.replace(':id', String(inv.vendorSocid))}?tab=vendor`} className="text-brand hover:underline">
                          {inv.vendor}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{inv.refSupplier}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{inv.invoiceDate}</td>
                      <td className="px-3 py-2 text-right text-text!">{formatMoney(inv.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.invoices.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2" colSpan={4}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-text!">{formatMoney(data.invoices.reduce((sum, i) => sum + i.amount, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
