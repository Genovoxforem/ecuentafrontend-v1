import { Landmark } from 'lucide-react'
import { AccountingJournalPage } from './AccountingJournalPage'
import { FINANCE_JOURNAL } from '../../accountingJournal.queries'

export function FinanceJournalPage() {
  return <AccountingJournalPage config={FINANCE_JOURNAL} icon={Landmark} />
}
