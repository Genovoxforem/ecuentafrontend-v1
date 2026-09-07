import { FileInput } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/supplier/list.php — byte-for-byte the same architecture as
// customer/list.php, sourced from facture_fourn instead, suggesting
// purchase-side accounts. Classic mass-select form-POST, no JSON.
export function VendorToDispatchList() {
  return (
    <InertListPage
      icon={FileInput}
      title="ToDispatch"
      sourcePath="accountancy/supplier/list.php"
      columns={['Invoice', 'Date', 'Product Ref', 'Description', 'Amount', 'VAT Rate', 'Third Party', 'Country', 'Suggested Account', 'Into Account']}
      note="The real page is a mass-select form (suggested account per row, tick rows, submit once), not a per-row instant save — not reproduced as a live write here."
    />
  )
}
