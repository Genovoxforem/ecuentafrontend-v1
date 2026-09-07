import { Coins } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// compta/bank/various_payment/card.php?action=create — classic form-POST,
// full-page reload, no JSON. The "direction" field is a hardcoded literal
// 0=Debit/1=Credit dropdown on the real page.
export function MiscPaymentCreatePage() {
  return (
    <DisabledFormPage
      icon={Coins}
      title="New Miscellaneous Payments"
      sourcePath="compta/bank/various_payment/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Date Payment', type: 'date', required: true },
            { label: 'Date Value', type: 'date' },
            { label: 'Amount', required: true },
            { label: 'Direction', type: 'select', options: ['Debit', 'Credit'] },
            { label: 'Bank Account', type: 'select', required: true },
            { label: 'Payment Mode', type: 'select' },
            { label: 'Accountancy Code', type: 'select' },
            { label: 'Subledger Account', type: 'select' },
            { label: 'Project', type: 'select' },
          ],
        },
      ]}
    />
  )
}
