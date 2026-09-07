import { Landmark } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// compta/sociales/card.php?action=create — classic form-POST (create() then
// redirect), no JSON.
export function SocialFiscalTaxCreatePage() {
  return (
    <DisabledFormPage
      icon={Landmark}
      title="New Social/Fiscal Tax"
      sourcePath="compta/sociales/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Label', required: true },
            { label: 'Type', type: 'select', required: true },
            { label: 'Date', type: 'date', required: true },
            { label: 'Period End Date', type: 'date' },
            { label: 'Amount', required: true },
            { label: 'Project', type: 'select' },
            { label: 'Payment Mode', type: 'select' },
            { label: 'Bank Account', type: 'select' },
          ],
        },
      ]}
    />
  )
}
