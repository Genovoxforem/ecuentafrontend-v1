import { Coins } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../../routes'

// compta/bank/various_payment/list.php — classic Dolibarr list, no JSON
// (its Excel export streams a real .xlsx server-side, also not JSON).
export function MiscPaymentsList() {
  return (
    <InertListPage
      icon={Coins}
      title="Miscellaneous Payments"
      sourcePath="compta/bank/various_payment/list.php"
      columns={['Ref', 'Label', 'Date Payment', 'Date Value', 'Payment Mode', 'Bank Account', 'Account Accounting', 'Subledger Account', 'Debit', 'Credit']}
      addLabel="New Miscellaneous Payments"
      addPath={ROUTES.ledgerMiscPaymentCreate}
    />
  )
}
