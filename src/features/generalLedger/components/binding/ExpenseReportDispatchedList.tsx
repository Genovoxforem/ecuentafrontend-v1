import { FileCheck } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/expensereport/lines.php — same architecture as
// customer/supplier lines.php, fee-type based. Classic form-POST, no JSON.
export function ExpenseReportDispatchedList() {
  return (
    <InertListPage
      icon={FileCheck}
      title="Dispatched"
      sourcePath="accountancy/expensereport/lines.php"
      columns={['Expense Report', 'Date', 'Fee Type', 'Description', 'Amount', 'Employee', 'Account Accounting']}
    />
  )
}
