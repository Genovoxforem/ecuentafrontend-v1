import { useState } from 'react'
import { HandCoins, Info, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { DisabledFormModal } from '../../../shared/components/forms/DisabledFormModal'

// Design only: custom/loanmanagement/loanmanagementlist.php (the real
// backend target of the "All Loan" menu leaf — read directly, not guessed)
// renders llx_loanmanagement straight to HTML and its "Add New" form posts
// as a plain PHP redirect (action=save_loan), with no JSON endpoint at all.
// Columns/status labels below match that table exactly (Loan ID, Loan
// Product, Borrower, Contact No, Release Date, Applied Amount, Status —
// Approved/Pending/Completed from the real status 1/0/2 mapping).
export function AllLoansListPage() {
  const [showAddLoan, setShowAddLoan] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HandCoins size={20} className="text-brand" /> All Loan
        </h2>
        <button type="button" onClick={() => setShowAddLoan(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add New
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>Design only — loanmanagementlist.php has no JSON API (its list and its Add New form are plain server-rendered PHP). Every control below is inert.</p>
      </div>

      {showAddLoan && (
        <DisabledFormModal
          icon={HandCoins}
          title="New Loan"
          sourcePath="custom/loanmanagement/loanmanagementlist.php?action=save_loan"
          fields={[
            { label: 'Loan Product', type: 'select', required: true },
            { label: 'Borrower (customer)', required: true },
            { label: 'Currency', type: 'select', required: true },
            { label: 'Customer Account', type: 'select', required: true },
            { label: 'Payment Type', type: 'select', required: true },
            { label: 'Payment Account Bank', type: 'select', required: true },
            { label: 'First Payment Date', type: 'date', required: true },
            { label: 'Release Date', type: 'date', required: true },
            { label: 'Applied Amount', required: true },
            { label: 'Late Payment Penalties (%)', required: true },
            { label: 'Description', type: 'textarea' },
            { label: 'Remarks', type: 'textarea' },
          ]}
          onClose={() => setShowAddLoan(false)}
        />
      )}

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Loan ID</th>
              <th className="font-medium px-4 py-2.5">Loan Product</th>
              <th className="font-medium px-4 py-2.5">Borrower</th>
              <th className="font-medium px-4 py-2.5">Contact No</th>
              <th className="font-medium px-4 py-2.5">Release Date</th>
              <th className="font-medium px-4 py-2.5">Applied Amount</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend — loanmanagementlist.php renders its table as server-side HTML with no JSON source.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
