import { CalendarRange } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// accountancy/admin/fiscalyear_card.php?action=create — classic form-POST
// (create() then redirect), no JSON.
export function FiscalPeriodCreatePage() {
  return (
    <DisabledFormPage
      icon={CalendarRange}
      title="New Fiscal Period"
      sourcePath="accountancy/admin/fiscalyear_card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Label', required: true },
            { label: 'Date Start', type: 'date', required: true },
            { label: 'Date End', type: 'date', required: true },
            { label: 'Status', type: 'select', options: ['Open', 'Close'] },
          ],
        },
      ]}
    />
  )
}
