import { FileSpreadsheet } from 'lucide-react'
import { DictListPage } from './DictListPage'

// admin/dict.php?id=17 — real, scraped rows (llx_c_type_fees, expense-report
// fee types) — see dolibarrDictParser.ts's own top comment.
export function ExpenseReportAccountsList() {
  return <DictListPage icon={FileSpreadsheet} title="Expense Report Accounts" path="/admin/dict.php?id=17" columns={['Code', 'Label', 'Accountancy Code']} />
}
