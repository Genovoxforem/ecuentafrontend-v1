import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useSalesInvoicesReport } from '../reports.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { formatMoney } from '../../../utils/format'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_BADGE_CLS: Record<string, string> = {
  Paid: 'bg-success-bg text-success-fg',
  Partial: 'bg-warning-bg text-warning-fg',
  Unpaid: 'bg-danger-bg text-danger-fg',
  Draft: 'bg-neutral-bg text-neutral-fg',
  'Written Off': 'bg-neutral-bg text-neutral-fg',
}

// Real via compta/facture/listreport_api.php — see reports.queries.ts for
// the full evidence trail. A genuinely real, secured, filterable DataTables
// report ("Sales Invoices" in the Reports Center's real "Receivables"
// category).
export function SalesInvoicesReportView() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const { data, isLoading, isError, error, refetch } = useSalesInvoicesReport(dateFrom, dateTo)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Sales Invoices
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} title="From" />
        <span className="text-text-faint text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} title="To" />
      </div>

      {isLoading && <LegacyLoadingCard label="Loading sales invoices…" />}
      {isError && <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Total (Excl.)</p>
              <p className="font-semibold text-text!">{data.totals.ht}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">VAT</p>
              <p className="font-semibold text-text!">{data.totals.vat}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Total (Incl.)</p>
              <p className="font-semibold text-text!">{data.totals.ttc}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Paid</p>
              <p className="font-semibold text-success-fg">{data.totals.paid}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Balance Due</p>
              <p className="font-semibold text-danger-fg">{data.totals.remain}</p>
            </Card>
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Customer</th>
                  <th className="font-medium px-3 py-2">Payment Mode</th>
                  <th className="font-medium px-3 py-2 text-right">Total (Excl.)</th>
                  <th className="font-medium px-3 py-2 text-right">Total (Incl.)</th>
                  <th className="font-medium px-3 py-2 text-right">Paid</th>
                  <th className="font-medium px-3 py-2 text-right">Balance Due</th>
                  <th className="font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No sales invoices found for the selected period.
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((inv, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{inv.ref}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{inv.date}</td>
                      <td className="px-3 py-2 text-text-muted">{inv.customer}</td>
                      <td className="px-3 py-2 text-text-muted">{inv.paymentMode}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{formatMoney(inv.totalHt)}</td>
                      <td className="px-3 py-2 text-right text-text!">{formatMoney(inv.totalTtc)}</td>
                      <td className="px-3 py-2 text-right text-success-fg">{formatMoney(inv.paid)}</td>
                      <td className="px-3 py-2 text-right text-danger-fg">{formatMoney(inv.remain)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLS[inv.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
