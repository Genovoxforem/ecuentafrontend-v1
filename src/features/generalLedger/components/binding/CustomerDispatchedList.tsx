import { FileCheck } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/customer/lines.php — already-bound lines, with a bulk
// "ChangeBinding" rebind form and a per-line edit link to card.php. Both are
// classic form-POST, no JSON.
export function CustomerDispatchedList() {
  return (
    <InertListPage
      icon={FileCheck}
      title="Dispatched"
      sourcePath="accountancy/customer/lines.php"
      columns={['Invoice', 'Date', 'Product Ref', 'Description', 'Amount', 'VAT Rate', 'Third Party', 'Country', 'Account Accounting']}
    />
  )
}
