import { Wallet } from 'lucide-react'
import { AccountingJournalPage } from './AccountingJournalPage'
import { EXPENSE_JOURNAL } from '../../accountingJournal.queries'

export function ExpenseJournalPage() {
  return <AccountingJournalPage config={EXPENSE_JOURNAL} icon={Wallet} />
}
