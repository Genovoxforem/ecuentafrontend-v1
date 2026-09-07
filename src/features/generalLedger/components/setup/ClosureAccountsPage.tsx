import { Lock } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// accountancy/admin/closure.php — a tiny settings form (profit/loss accounts
// + default closure journal), reads/writes Dolibarr constants directly, no
// list, no JSON.
export function ClosureAccountsPage() {
  return (
    <DisabledFormPage
      icon={Lock}
      title="Closure Accounts"
      sourcePath="accountancy/admin/closure.php"
      sections={[{ fields: [{ label: 'Profit Account', required: true }, { label: 'Loss Account', required: true }, { label: 'Default Closure Journal', type: 'select', required: true }] }]}
    />
  )
}
