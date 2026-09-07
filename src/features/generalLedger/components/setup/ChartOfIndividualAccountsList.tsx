import { Users } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/admin/subaccount.php — read-only union of customer/supplier/
// employee subsidiary-ledger accounts, no JSON. Edits happen on each
// third-party's/user's own card.php (a different module), not here.
export function ChartOfIndividualAccountsList() {
  return (
    <InertListPage
      icon={Users}
      title="Chart Of Individual Accounts"
      sourcePath="accountancy/admin/subaccount.php"
      columns={['Account Number', 'Label', 'Type', 'Reconcilable', 'Action']}
      note="Read-only on the real page too — edits happen on the underlying customer/supplier/employee record, not here."
    />
  )
}
