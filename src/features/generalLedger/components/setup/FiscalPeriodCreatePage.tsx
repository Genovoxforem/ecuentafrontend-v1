import { CalendarRange } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyFormPage } from '../LegacyFormPage'
import { loadFiscalPeriodForm, saveFiscalPeriod } from '../../fiscalPeriodsFapi'

// accountancy/fapi/fiscal_periods.php?action=create — the "New fiscal period" form; Save creates the period and returns to the list.
export function FiscalPeriodCreatePage() {
  return (
    <LegacyFormPage
      icon={CalendarRange}
      title="New Fiscal Period"
      path="/accountancy/admin/fiscalyear_card.php"
      query={{ action: 'create' }}
      anchor="label"
      redirectTo={ROUTES.ledgerFiscalPeriod}
      load={loadFiscalPeriodForm}
      save={saveFiscalPeriod}
      fields={[
        { name: 'label', label: 'Label', required: true },
        { name: 'fiscalyear', label: 'Start date', kind: 'date', required: true },
        { name: 'fiscalyearend', label: 'End date', kind: 'date', required: true },
        { name: 'statut', label: 'Status' },
      ]}
    />
  )
}
