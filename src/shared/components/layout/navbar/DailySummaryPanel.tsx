import { X } from 'lucide-react'
import { useDailySummary, type DailySummaryRow } from '../../../../features/dailySummary/dailySummary.queries'
import { formatMoney, formatDate } from '../../../../utils/format'

function Table({ title, rows, emptyLabel, totalLabel }: { title: string; rows: DailySummaryRow[]; emptyLabel: string; totalLabel: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-faint mb-1.5">{title}</div>
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-surface-alt">
              <th className="px-2 py-1.5 text-left font-semibold text-text-muted">Ref / Party</th>
              <th className="px-2 py-1.5 text-left font-semibold text-text-muted">Mode</th>
              <th className="px-2 py-1.5 text-right font-semibold text-text-muted">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-3 text-center text-text-faint italic">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1.5 text-text">
                  {r.ref}
                  {r.thirdPartyName ? ` · ${r.thirdPartyName}` : ''}
                </td>
                <td className="px-2 py-1.5 text-text-muted">{r.modeLabel || '-'}</td>
                <td className="px-2 py-1.5 text-right text-text">{formatMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-surface-alt font-semibold">
                <td colSpan={2} className="px-2 py-1.5 text-text">
                  {totalLabel}
                </td>
                <td className="px-2 py-1.5 text-right text-text">{formatMoney(rows.reduce((a, r) => a + r.amount, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// Ports the legacy Navbar History icon's "Daily Summary – With VAT & P&L"
// panel. Reads from useDailySummary (stubbed in this project — see
// dailySummary.queries.ts), so it renders its loading-complete empty state.
export function DailySummaryPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useDailySummary()

  return (
    <div className="absolute right-0 mt-1 w-[420px] max-h-[calc(100vh-4rem)] overflow-y-auto soft-scrollbar bg-surface border border-border rounded-lg shadow-xl z-30">
      <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-surface">
        <div>
          <div className="text-sm font-semibold text-text">Daily Summary – With VAT &amp; P&amp;L</div>
          {data && <div className="text-xs text-text-faint">Date: {formatDate(data.date)}</div>}
        </div>
        <button type="button" onClick={onClose} title="Close" className="p-1 rounded-md text-text-faint hover:bg-surface-alt">
          <X size={16} />
        </button>
      </div>

      <div className="p-3">
        {isLoading && <p className="text-xs text-text-faint text-center py-6">Loading…</p>}
        {!isLoading && !data && <p className="text-xs text-text-faint text-center py-6">No summary data available.</p>}
        {data && (
          <>
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-faint mb-1.5">Opening Balance</div>
              <div className="border border-border rounded-md overflow-hidden text-xs">
                <div className="flex justify-between px-2 py-1.5 border-b border-border">
                  <span className="text-text-muted">Cash In Hand</span>
                  <span className="text-text">{formatMoney(data.opening.cashInHand)}</span>
                </div>
                <div className="flex justify-between px-2 py-1.5 border-b border-border">
                  <span className="text-text-muted">Bank Balance</span>
                  <span className="text-text">{formatMoney(data.opening.bankBalance)}</span>
                </div>
                <div className="flex justify-between px-2 py-1.5 bg-surface-alt font-semibold">
                  <span className="text-text">Total Opening Balance</span>
                  <span className="text-text">{formatMoney(data.opening.total)}</span>
                </div>
              </div>
            </div>

            <Table title="Income / Receipts (With VAT)" rows={data.income.rows} emptyLabel="No Income Records Found For Today" totalLabel="Total Income" />
            <Table title="Expenses / Payments (With VAT)" rows={data.expenses.rows} emptyLabel="No Expense Records Found For Today" totalLabel="Total Expenses" />

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-faint mb-1.5">Profit &amp; Loss Statement (Daily)</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="px-2 py-1.5 bg-surface-alt font-semibold text-text">Income</div>
                  <div className="flex justify-between px-2 py-1.5">
                    <span className="text-text-muted">Sales Revenue</span>
                    <span className="text-text">{formatMoney(data.profitLoss.salesRevenue)}</span>
                  </div>
                </div>
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="px-2 py-1.5 bg-surface-alt font-semibold text-text">Expense</div>
                  <div className="flex justify-between px-2 py-1.5">
                    <span className="text-text-muted">Operating Expenses</span>
                    <span className="text-text">{formatMoney(data.profitLoss.operatingExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
