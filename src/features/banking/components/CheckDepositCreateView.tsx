import { Wallet2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// Native replacement for linking out to
// compta/paiement/cheque/card.php?action=new — no JSON API (confirmed by
// reading the PHP source directly). Matches the real page's own layout: a
// check-reception date filter plus a bank account selector, listing checks
// awaiting deposit below.
export function CheckDepositCreateView() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet2 size={20} className="text-brand" /> New Deposit
      </h2>
      <p className="text-sm text-text-muted">Select/filter checks to include in the check deposit receipt and click on "Create".</p>


      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Check reception date — From</span>
            <input disabled type="date" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Check reception date — to</span>
            <input disabled type="date" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Bank account</span>
            <select disabled className={inputCls}>
              <option>Select a bank account</option>
            </select>
          </label>
        </div>
        <button type="button" disabled className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand/50 text-white cursor-not-allowed w-fit">
          Filter
        </button>
        <p className="text-sm text-text-faint italic pt-2">No checks awaiting deposit.</p>
      </Card>
    </div>
  )
}
