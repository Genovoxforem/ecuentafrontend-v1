import { Receipt } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// admin/dict.php?id=7 — social/tax contributions dictionary (llx_c_chargesociales).
// Same generic dict.php engine as Vat/Expense-report accounts, no JSON.
export function TaxAccountsList() {
  return <InertListPage icon={Receipt} title="Tax Accounts" sourcePath="admin/dict.php?id=7" columns={['Code', 'Label', 'Country', 'Accountancy Code', 'Deductible', 'Action']} />
}
