import { Percent } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// admin/dict.php?id=10 — one mode of Dolibarr's generic dictionary engine
// (table llx_c_tva). Classic form-POST add/modify/delete, no JSON.
export function VatAccountsList() {
  return (
    <InertListPage
      icon={Percent}
      title="Vat Accounts"
      sourcePath="admin/dict.php?id=10"
      columns={['Country', 'Code', 'Rate', 'Local Tax 2', 'Local Tax 3', 'NPR', 'Accountancy Code Sell', 'Accountancy Code Buy', 'Note', 'Action']}
    />
  )
}
