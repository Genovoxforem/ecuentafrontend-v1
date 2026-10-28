import { CalendarRange } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'
import { loadFiscalPeriods } from '../../fiscalPeriodsFapi'

// accountancy/fapi/fiscal_periods.php — the real list of accounting periods.
export function FiscalPeriodList() {
  return (
    <LegacyListPage
      icon={CalendarRange}
      title="Fiscal Period"
      path="/accountancy/admin/fiscalyear.php"
      load={loadFiscalPeriods}
      firstHeader={/^Ref/}
      addTo={{ label: 'New Fiscal Period', to: ROUTES.ledgerFiscalPeriodCreate }}
    />
  )
}
