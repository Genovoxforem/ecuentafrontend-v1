import { Wallet2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useChequeArea } from '../banking.queries'

const RECEIPT_COLUMNS = ['Date', 'Account', 'No. Of Checks', 'Amount', 'Status']

// Native replacement for compta/paiement/cheque/index.php: the "Checks Awaiting Deposit" count comes from
// compta/paiement/fapi/cheque_deposits.php. That answer's receipt rows are empty on the instance, so their fields are not
// known and the table shows the empty state (or only how many came back), same as CheckDepositListView.tsx.
export function CheckDepositsAreaView() {
  const area = useChequeArea()
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet2 size={20} className="text-brand" /> Check deposits area
      </h2>


      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 bg-brand text-white text-sm font-bold">Bank Checks</div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-text-muted">Checks Awaiting Deposit</span>
          <span className="text-sm font-semibold text-text!">{area.isLoading ? '...' : area.isError ? '-' : area.data?.awaitingDeposit}</span>
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
                {area.data && area.data.receiptCount > 0 ? `${area.data.receiptCount} check receipts found (their details are not available yet).` : 'No check receipts found.'}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
