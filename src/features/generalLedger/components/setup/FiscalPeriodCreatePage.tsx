import { CalendarRange } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyFormPage } from '../LegacyFormPage'

// accountancy/admin/fiscalyear_card.php?action=create — the real "New fiscal
// period" form; Save posts action=add and the backend redirects to the new period.
export function FiscalPeriodCreatePage() {
  return (
    <LegacyFormPage
      icon={CalendarRange}
      title="New Fiscal Period"
      path="/accountancy/admin/fiscalyear_card.php"
      query={{ action: 'create' }}
      anchor="label"
      redirectTo={ROUTES.ledgerFiscalPeriod}
      fields={[
        { name: 'label', label: 'Label', required: true },
        { name: 'fiscalyear', label: 'Start date', kind: 'date', required: true },
        { name: 'fiscalyearend', label: 'End date', kind: 'date', required: true },
        { name: 'statut', label: 'Status' },
      ]}
    />
  )
}
