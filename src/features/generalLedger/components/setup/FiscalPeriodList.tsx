import { CalendarRange } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'

// accountancy/admin/fiscalyear.php — the real list of accounting periods.
export function FiscalPeriodList() {
  return (
    <LegacyListPage
      icon={CalendarRange}
      title="Fiscal Period"
      path="/accountancy/admin/fiscalyear.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Fiscal Period', to: ROUTES.ledgerFiscalPeriodCreate }}
    />
  )
}
