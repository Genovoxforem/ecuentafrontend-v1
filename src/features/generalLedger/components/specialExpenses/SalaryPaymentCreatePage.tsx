import { Banknote } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// salaries/card.php?action=create — classic form-POST, full-page reload, no JSON.
export function SalaryPaymentCreatePage() {
  return (
    <DisabledFormPage
      icon={Banknote}
      title="New Payment - Salaries"
      sourcePath="salaries/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Employee', type: 'select', required: true },
            { label: 'Date Payment', type: 'date', required: true },
            { label: 'Date Value', type: 'date', required: true },
            { label: 'Period Start', type: 'date' },
            { label: 'Period End', type: 'date' },
            { label: 'Amount', required: true },
            { label: 'Label' },
            { label: 'Payment Mode', type: 'select' },
            { label: 'Bank Account', type: 'select' },
            { label: 'Project', type: 'select' },
          ],
        },
      ]}
    />
  )
}
