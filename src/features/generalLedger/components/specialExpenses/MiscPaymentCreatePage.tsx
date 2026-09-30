import { Coins } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyFormPage } from '../LegacyFormPage'

// compta/bank/various_payment/card.php?action=create — the real "New
// miscellaneous payment" form; Save posts action=add and the backend
// redirects to the new payment.
export function MiscPaymentCreatePage() {
  return (
    <LegacyFormPage
      icon={Coins}
      title="New Miscellaneous Payment"
      path="/compta/bank/various_payment/card.php"
      query={{ action: 'create' }}
      anchor="sens"
      redirectTo={ROUTES.ledgerMiscPaymentsList}
      fields={[
        { name: 'datep', label: 'Date of payment', kind: 'date', required: true },
        { name: 'datev', label: 'Value date', kind: 'date' },
        { name: 'label', label: 'Label', required: true },
        { name: 'amount', label: 'Amount', required: true },
        { name: 'accountid', label: 'Bank account', required: true },
        { name: 'multicurrency_code', label: 'Currency' },
        { name: 'paymenttype', label: 'Payment type', required: true },
        { name: 'num_payment', label: 'Number' },
        { name: 'accountancy_code', label: 'Account' },
        { name: 'subledger_account', label: 'Subledger account' },
        { name: 'sens', label: 'Direction', required: true },
        { name: 'fk_project', label: 'Project' },
      ]}
    />
  )
}
