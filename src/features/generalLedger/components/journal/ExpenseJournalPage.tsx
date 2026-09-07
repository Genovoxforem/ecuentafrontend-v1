import { Wallet } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/journal/expensereportsjournal.php?id_journal=6 — real
// llx_expensereport-sourced report, classic form-POST "Write into Ledger"
// action, no JSON.
export function ExpenseJournalPage() {
  return (
    <InertListPage
      icon={Wallet}
      title="Expense Journal"
      sourcePath="accountancy/journal/expensereportsjournal.php?id_journal=6"
      columns={['Date', 'Piece', 'Account Accounting', 'Subledger Account', 'Label Operation', 'Debit', 'Credit']}
    />
  )
}
