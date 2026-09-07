import { FileCheck } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/supplier/lines.php — same architecture as customer/lines.php,
// purchase-side. Classic form-POST, no JSON.
export function VendorDispatchedList() {
  return (
    <InertListPage
      icon={FileCheck}
      title="Dispatched"
      sourcePath="accountancy/supplier/lines.php"
      columns={['Invoice', 'Date', 'Product Ref', 'Description', 'Amount', 'VAT Rate', 'Third Party', 'Country', 'Account Accounting']}
    />
  )
}
