import { Package } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/admin/productaccount.php — a product/service-to-account
// binding list (llx_product joined to llx_accounting_account), classic
// full-page mass-action form-POST, no JSON.
export function ProductAccountsList() {
  return (
    <InertListPage
      icon={Package}
      title="Product Accounts"
      sourcePath="accountancy/admin/productaccount.php"
      columns={['Ref', 'Label', 'Description', 'VAT Rate', 'Current Account', 'Action']}
      note="Real page also has a Sell/Buy mode switch and a mass-account-change action — both classic full-page form-POST, not reproduced here."
    />
  )
}
