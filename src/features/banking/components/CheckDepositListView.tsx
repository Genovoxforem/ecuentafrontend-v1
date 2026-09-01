import { Receipt, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// Native replacement for linking out to compta/paiement/cheque/list.php —
// no JSON API (confirmed by reading the PHP source directly). Matches the
// real page's own search bar and column set.
export function CheckDepositListView() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Check Deposits
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/paiement/cheque/list.php</code> — a classic full-page-reload page, no JSON API. Search fields below match that page's own form exactly;
          they're disabled since there's nothing to submit to.
        </p>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 border-b border-border">
          <input disabled placeholder="Search By Ref" className={inputCls} />
          <input disabled placeholder="Search By Date" className={inputCls} />
          <select disabled className={inputCls}>
            <option>Select a bank account</option>
          </select>
          <input disabled placeholder="Search By Amount" className={inputCls} />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-3 py-2">Ref</th>
              <th className="font-medium px-3 py-2">Creation Date</th>
              <th className="font-medium px-3 py-2">Account</th>
              <th className="font-medium px-3 py-2">Number of Checks</th>
              <th className="font-medium px-3 py-2 text-right">Amount</th>
              <th className="font-medium px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-3 py-4 text-text-faint italic">
                None
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
