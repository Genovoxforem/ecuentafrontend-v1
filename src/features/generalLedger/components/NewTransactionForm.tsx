import { FilePlus } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// accountancy/bookkeeping/card.php?action=add — confirmed real (creates a
// llx_accounting_bookkeeping journal entry) but classic form-POST only, no
// JSON create endpoint anywhere in this module. Fields below match the
// real manual journal entry form's own field set.
export function NewTransactionForm() {
  return (
    <DisabledFormPage
      icon={FilePlus}
      title="New Transaction"
      sourcePath="accountancy/bookkeeping/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Journal Code', type: 'select', required: true },
            { label: 'Document Date', type: 'date', required: true },
            { label: 'Piece Number' },
            { label: 'Account', type: 'select', required: true },
            { label: 'Subledger Account', type: 'select' },
            { label: 'Subledger Account Label' },
            { label: 'Label', required: true },
            { label: 'Debit' },
            { label: 'Credit' },
          ],
        },
      ]}
    />
  )
}
