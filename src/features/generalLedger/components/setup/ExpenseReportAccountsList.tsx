import { FileSpreadsheet } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// admin/dict.php?id=17 — expense-report fee-type dictionary (llx_c_type_fees).
// Same generic dict.php engine, no JSON.
export function ExpenseReportAccountsList() {
  return <InertListPage icon={FileSpreadsheet} title="Expense Report Accounts" sourcePath="admin/dict.php?id=17" columns={['Code', 'Label', 'Accountancy Code', 'Action']} />
}
