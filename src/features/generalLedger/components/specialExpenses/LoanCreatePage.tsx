import { HandCoins } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyFormPage } from '../LegacyFormPage'

// loan/card.php?action=create — the real "New loan" form; Save posts
// action=add and the backend redirects to the new loan.
export function LoanCreatePage() {
  return (
    <LegacyFormPage
      icon={HandCoins}
      title="New Loan"
      path="/loan/card.php"
      query={{ action: 'create' }}
      anchor="capital"
      redirectTo={ROUTES.ledgerEmployeeLoansList}
      fields={[
        { name: 'label', label: 'Label', required: true },
        { name: 'accountid', label: 'Bank account', required: true },
        { name: 'capital', label: 'Principal amount', required: true },
        { name: 'nbterm', label: 'Number of terms', required: true },
        { name: 'start', label: 'Start date', kind: 'date', required: true },
        { name: 'end', label: 'Validation date', kind: 'date' },
        { name: 'ratetype', label: 'Interest type', kind: 'radio' },
        { name: 'rate', label: 'Percentage / total sum' },
        { name: 'slot', label: 'Slot' },
        { name: 'receipt', label: 'Receipt' },
        { name: 'projectid', label: 'Project' },
        { name: 'insurance_amount', label: 'Insurance / additional charges' },
        { name: 'accountancy_account_capital', label: 'Accounting account capital' },
        { name: 'accountancy_account_insurance', label: 'Accounting account insurance' },
        { name: 'accountancy_account_interest', label: 'Accounting account interest' },
        { name: 'note_private', label: 'Note (private)', kind: 'textarea' },
        { name: 'note_public', label: 'Note (public)', kind: 'textarea' },
      ]}
    />
  )
}
