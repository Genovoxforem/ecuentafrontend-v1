import { Receipt } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/journal/sellsjournal.php?id_journal=1 — real
// llx_facturedet-sourced report, classic form-POST "Write into Ledger"
// action, no JSON.
export function SellJournalPage() {
  return (
    <InertListPage
      icon={Receipt}
      title="Sell Journal"
      sourcePath="accountancy/journal/sellsjournal.php?id_journal=1"
      columns={['Date', 'Piece', 'Account Accounting', 'Subledger Account', 'Label Operation', 'Debit', 'Credit']}
    />
  )
}
