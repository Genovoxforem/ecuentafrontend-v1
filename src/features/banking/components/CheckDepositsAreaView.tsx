import { Wallet2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'

const RECEIPT_COLUMNS = ['Date', 'Account', 'No. Of Checks', 'Amount', 'Status']

// Native replacement for linking out to compta/paiement/cheque/index.php —
// no JSON API (confirmed by reading the PHP source directly), so this
// reproduces the real page's own layout (a "Checks Awaiting Deposit" count
// plus a "Latest 10 Check Receipts" table) without a real data source to
// populate either from — both always show their honest empty state, same
// pattern as CheckDepositListView.tsx.
export function CheckDepositsAreaView() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet2 size={20} className="text-brand" /> Check deposits area
      </h2>


      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 bg-brand text-white text-sm font-bold">Bank Checks</div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-text-muted">Checks Awaiting Deposit</span>
          <span className="text-sm font-semibold text-text!">0</span>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 bg-brand text-white text-sm font-bold">Latest 10 Check Receipts</div>
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              {RECEIPT_COLUMNS.map((label) => (
                <Th key={label}>{label}</Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            <tr>
              <td colSpan={RECEIPT_COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                No check receipts found.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
