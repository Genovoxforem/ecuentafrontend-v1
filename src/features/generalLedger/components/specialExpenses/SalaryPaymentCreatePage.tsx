import { Banknote } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { saveSalaryPayment } from '../../specialPaymentsSave'
import { loadSalaryForm } from '../../specialMetaFapi'
import { JsonFormPage } from '../JsonFormPage'

// salaries/card.php?action=create — the real "New payment - salaries" form;
// Save posts action=add and the backend redirects to the new payment.
export function SalaryPaymentCreatePage() {
  return (
    <JsonFormPage
      load={loadSalaryForm}
      save={saveSalaryPayment}
      icon={Banknote}
      title="New Payment - Salaries"
      queryKey="/salaries/card.php"
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
