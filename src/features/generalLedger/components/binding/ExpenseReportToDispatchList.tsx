import { FileInput } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/expensereport/list.php — same mass-select bind architecture,
// but bound by fee type (llx_c_type_fees) rather than a product's own
// account, and with no employee-specific binding. Classic form-POST, no JSON.
export function ExpenseReportToDispatchList() {
  return (
    <InertListPage
      icon={FileInput}
      title="ToDispatch"
      sourcePath="accountancy/expensereport/list.php"
      columns={['Expense Report', 'Date', 'Fee Type', 'Description', 'Amount', 'Employee', 'Suggested Account', 'Into Account']}
      note="The real page is a mass-select form (suggested account per row, tick rows, submit once), not a per-row instant save — not reproduced as a live write here."
    />
  )
}
