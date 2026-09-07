import { Percent } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// compta/tva/card.php?action=create — classic form-POST (addPayment() then
// redirect), no JSON. The real page's "refund" radio (0=Payment/1=Refund) is
// a hardcoded literal, not DB-driven.
export function SalesTaxCreatePage() {
  return (
    <DisabledFormPage
      icon={Percent}
      title="New Sales Tax"
      sourcePath="compta/tva/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Payment / Refund', type: 'select', options: ['Payment', 'Refund'], required: true },
            { label: 'Date Payment', type: 'date', required: true },
            { label: 'Period End Date', type: 'date', required: true },
            { label: 'Label' },
            { label: 'Amount', required: true },
            { label: 'Bank Account', type: 'select' },
            { label: 'Payment Mode', type: 'select' },
            { label: 'Number' },
          ],
        },
      ]}
    />
  )
}
