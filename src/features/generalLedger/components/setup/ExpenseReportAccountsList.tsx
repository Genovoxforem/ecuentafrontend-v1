import { FileSpreadsheet } from 'lucide-react'
import { AccountDictionaryPage } from './AccountDictionaryPage'

// General Ledger > Setup > Expense report accounts (accountancy/fapi/expensereport_accounts.php): see accountDictionaries.data.ts.
export function ExpenseReportAccountsList() {
  return <AccountDictionaryPage dictionary='expense' icon={FileSpreadsheet} />
}
