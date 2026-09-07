import { FileInput } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/customer/list.php — the real "bind to account" screen: a
// multi-row form-POST (mass-select rows, pick a suggested/edited account per
// row, submit once), not a per-row AJAX/JSON save. Columns match the real
// page's own arrayfields exactly.
export function CustomerToDispatchList() {
  return (
    <InertListPage
      icon={FileInput}
      title="ToDispatch"
      sourcePath="accountancy/customer/list.php"
      columns={['Invoice', 'Date', 'Product Ref', 'Description', 'Amount', 'VAT Rate', 'Third Party', 'Country', 'Suggested Account', 'Into Account']}
      note="The real page is a mass-select form (suggested account per row, tick rows, submit once), not a per-row instant save — not reproduced as a live write here."
    />
  )
}
