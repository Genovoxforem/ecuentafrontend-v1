import { ShoppingCart } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/journal/purchasesjournal.php?id_journal=2 — real
// llx_facture_fourn-sourced report, classic form-POST "Write into Ledger"
// action, no JSON.
export function PurchaseJournalPage() {
  return (
    <InertListPage
      icon={ShoppingCart}
      title="Purchase Journal"
      sourcePath="accountancy/journal/purchasesjournal.php?id_journal=2"
      columns={['Date', 'Piece', 'Account Accounting', 'Subledger Account', 'Label Operation', 'Debit', 'Credit']}
    />
  )
}
