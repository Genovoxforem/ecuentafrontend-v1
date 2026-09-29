import { Receipt } from 'lucide-react'
import { AccountingJournalPage } from './AccountingJournalPage'
import { SELL_JOURNAL } from '../../accountingJournal.queries'

export function SellJournalPage() {
  return <AccountingJournalPage config={SELL_JOURNAL} icon={Receipt} />
}
