import { FileSpreadsheet } from 'lucide-react'
import { DictionaryPage } from './DictionaryPage'

// General Ledger > Setup > Expense report accounts: the backend's own dictionary of expense report
// line types (admin/dict.php?id=17), with the accounting account each one posts to.
export function ExpenseReportAccountsList() {
  return <DictionaryPage id="17" title="Dictionary setup - Expense report - Types of expense report lines" dictionaryName="expense report line type" icon={FileSpreadsheet} />
}
