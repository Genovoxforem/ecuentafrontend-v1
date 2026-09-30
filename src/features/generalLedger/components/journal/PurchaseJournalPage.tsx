import { ShoppingCart } from 'lucide-react'
import { AccountingJournalPage } from './AccountingJournalPage'
import { PURCHASE_JOURNAL } from '../../accountingJournal.queries'

export function PurchaseJournalPage() {
  return <AccountingJournalPage config={PURCHASE_JOURNAL} icon={ShoppingCart} />
}
