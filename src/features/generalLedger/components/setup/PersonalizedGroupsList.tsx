import { Layers } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/admin/categories_list.php?id=32 — generic dictionary table
// (llx_c_accounting_category), classic form-POST add/modify/delete, no JSON.
export function PersonalizedGroupsList() {
  return (
    <InertListPage
      icon={Layers}
      title="Personalized Groups"
      sourcePath="accountancy/admin/categories_list.php?id=32"
      columns={['Code', 'Label', 'Comment', 'Calculated', 'Formula', 'Position', 'Country', 'Action']}
    />
  )
}
