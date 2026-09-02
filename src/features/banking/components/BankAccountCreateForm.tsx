import { Landmark } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to compta/bank/card.php?action=create
// — no JSON API (confirmed by reading the PHP source directly: the only
// json_encode calls are for storing extraparams in the DB, not a response).
// Fields below match that page's real form exactly (labels read from the
// PHP source's own $langs->trans() keys).
export function BankAccountCreateForm() {
  return (
    <DisabledFormPage
      icon={Landmark}
      title="New Financial Account"
      sourcePath="compta/bank/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Ref', required: true },
            { label: 'Bank or cash label', required: true },
            { label: 'Account type', type: 'select', required: true, options: ['Current or credit card account', 'Cash account', 'Savings account'] },
          ],
        },
        {
          fields: [
            { label: 'Currency', type: 'select', required: true },
            { label: 'Status', type: 'select', required: true, options: ['Open', 'Closed'] },
            { label: 'Account country', type: 'select', required: true },
          ],
        },
        {
          fields: [
            { label: 'State/Province', type: 'select' },
            { label: 'Web' },
            { label: 'Tags/categories', type: 'select' },
          ],
        },
        {
          fields: [
            { label: 'Comment', type: 'textarea' },
            { label: 'Initial balance' },
            { label: 'Date', type: 'date' },
          ],
        },
        {
          heading: 'Balance limits',
          fields: [{ label: 'Minimum allowed balance' }, { label: 'Minimum desired balance' }, { label: 'Bank name' }],
        },
        {
          heading: 'Bank details',
          fields: [
            { label: 'Account number' },
            { label: 'IBAN account number' },
            { label: 'BIC/SWIFT code' },
            { label: 'Bank address', type: 'textarea' },
            { label: 'Account owner name' },
            { label: 'Account owner address', type: 'textarea' },
          ],
        },
        {
          heading: 'Accounting',
          fields: [
            { label: 'Accounting account', type: 'select', required: true },
            { label: 'Accounting code journal', type: 'select' },
          ],
        },
      ]}
    />
  )
}
