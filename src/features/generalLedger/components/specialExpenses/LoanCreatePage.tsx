import { HandCoins } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// loan/card.php?action=create — classic form-POST, full-page reload, no
// JSON create endpoint. The real page does have a genuine JSON calculator
// (loan/calcmens.php, a live amortization-schedule preview) for UI feedback
// only — not persistence — left for a future pass since it needs care to
// call correctly (its first row is a special zero-interest anchor entry).
export function LoanCreatePage() {
  return (
    <DisabledFormPage
      icon={HandCoins}
      title="New Loans"
      sourcePath="loan/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Label', required: true },
            { label: 'Capital', required: true },
            { label: 'Number Of Terms', required: true },
            { label: 'Rate' },
            { label: 'Rate Type', type: 'select', options: ['Percentage', 'Total Sum'] },
            { label: 'Date Start', type: 'date', required: true },
            { label: 'Date End', type: 'date' },
            { label: 'Capital Account', type: 'select' },
            { label: 'Insurance Account', type: 'select' },
            { label: 'Interest Account', type: 'select' },
          ],
        },
      ]}
    />
  )
}
