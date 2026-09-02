import { HandCoins } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to loan/card.php?action=create — no
// JSON API (confirmed by reading the PHP source directly). A real
// monthly-payment calculator (loan/calcmens.php) backs the real form's own
// live preview, but isn't wired here. Fields below match the real form's
// own field set (labels read from the PHP source's own $langs->trans()
// keys).
export function LoanCreateForm() {
  return (
    <DisabledFormPage
      icon={HandCoins}
      title="New Loan"
      sourcePath="loan/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Label', required: true },
            { label: 'Account', type: 'select', required: true },
            { label: 'Principal amount', required: true },
          ],
        },
        {
          fields: [
            { label: 'Number of terms', required: true },
            { label: 'Start date', type: 'date', required: true },
            { label: 'Validation Date', type: 'date', required: true },
          ],
        },
        {
          fields: [
            { label: 'Interest Type', type: 'select', required: true, options: ['Percentage', 'Total Sum'] },
            { label: 'Percentage/Total Sum', required: true },
            { label: 'Slot' },
          ],
        },
        {
          fields: [{ label: 'Receipt' }, { label: 'Project', type: 'select' }, { label: 'Note (private)', type: 'textarea' }],
        },
        {
          fields: [{ label: 'Note (public)', type: 'textarea' }, { label: 'Insurance/Additional Charges' }],
        },
        {
          heading: 'Accounting',
          fields: [
            { label: 'Accounting account capital', type: 'select', required: true },
            { label: 'Accounting account insurance', type: 'select', required: true },
            { label: 'Accounting account interest', type: 'select', required: true },
          ],
        },
      ]}
    />
  )
}
