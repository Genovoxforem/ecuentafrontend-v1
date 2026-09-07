import { Landmark } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/journal/bankjournal.php?id_journal=3 — real llx_bank-sourced
// report, classic form-POST "Write into Ledger" action (full-page reload
// inserting into accounting_bookkeeping), no JSON.
export function FinanceJournalPage() {
  return (
    <InertListPage
      icon={Landmark}
      title="Finance Journal"
      sourcePath="accountancy/journal/bankjournal.php?id_journal=3"
      columns={['Date', 'Piece', 'Account Accounting', 'Subledger Account', 'Label Operation', 'Payment Mode', 'Debit', 'Credit']}
    />
  )
}
