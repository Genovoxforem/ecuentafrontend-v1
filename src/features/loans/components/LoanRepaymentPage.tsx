import { CalendarClock, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// Design only: custom/loanmanagement/repayment.php (read directly) queries
// llx_loan_repayments (WHERE status = 0, i.e. unpaid schedule rows) and
// renders straight to HTML — its "Pay" action is a plain form post, no JSON
// endpoint anywhere on this page. Columns match the real table exactly
// (Loan ID, Date, Borrower, Principal Amount, Interest, Penalty, Amount to
// Pay, Balance, Status — Due/Unpaid/Paid from the real status/date logic).
export function LoanRepaymentPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CalendarClock size={20} className="text-brand" /> Repayment
      </h2>

      <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>Design only — repayment.php has no JSON API (its schedule and Pay action are plain server-rendered PHP). This screen is display-only.</p>
      </div>

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Loan ID</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Borrower</th>
              <th className="font-medium px-4 py-2.5">Principal Amount</th>
              <th className="font-medium px-4 py-2.5">Interest</th>
              <th className="font-medium px-4 py-2.5">Penalty</th>
              <th className="font-medium px-4 py-2.5">Amount to Pay</th>
              <th className="font-medium px-4 py-2.5">Balance</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={9} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend — repayment.php renders its schedule as server-side HTML with no JSON source.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
