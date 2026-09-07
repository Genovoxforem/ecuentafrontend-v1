import { Building2 } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// compta/bank/list.php — classic Dolibarr list over llx_bank_account, no
// JSON. Create/edit happens on compta/bank/card.php (a different module).
export function BankAccountsSetupList() {
  return (
    <InertListPage
      icon={Building2}
      title="Bank Accounts"
      sourcePath="compta/bank/list.php"
      columns={['Bank Account', 'Label', 'Type', 'Account Number', 'Account Accounting', 'Journal', 'To Reconcile', 'Currency', 'Date Creation', 'Status', 'Balance']}
    />
  )
}
