import { Banknote } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyFormPage } from '../LegacyFormPage'

// salaries/card.php?action=create — the real "New payment - salaries" form;
// Save posts action=add and the backend redirects to the new payment.
export function SalaryPaymentCreatePage() {
  return (
    <LegacyFormPage
      icon={Banknote}
      title="New Payment - Salaries"
      path="/salaries/card.php"
      query={{ action: 'create' }}
      anchor="fk_user"
      submitExtra={{ save: 'Save' }}
      redirectTo={ROUTES.ledgerSalaryList}
      fields={[
        { name: 'fk_user', label: 'Employee', required: true },
        { name: 'label', label: 'Label', required: true },
        { name: 'datep', label: 'Date of payment', kind: 'date', required: true },
        { name: 'datev', label: 'Value date', kind: 'date' },
        { name: 'datesp', label: 'Start date of period', kind: 'date', required: true },
        { name: 'dateep', label: 'End date of period', kind: 'date', required: true },
        { name: 'amount', label: 'Amount', required: true },
        { name: 'accountid', label: 'Bank account', required: true },
        { name: 'paymenttype', label: 'Payment type', required: true },
        { name: 'num_payment', label: 'Number' },
        { name: 'fk_project', label: 'Project' },
      ]}
    />
  )
}
