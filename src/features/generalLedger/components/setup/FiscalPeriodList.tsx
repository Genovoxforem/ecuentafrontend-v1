import { CalendarRange } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { JsonListPage } from '../JsonListPage'
import { loadFiscalPeriods } from '../../fiscalPeriodsFapi'

// accountancy/fapi/fiscal_periods.php — the real list of accounting periods.
export function FiscalPeriodList() {
  return (
    <JsonListPage
      icon={CalendarRange}
      title="Fiscal Period"
      queryKey="/accountancy/admin/fiscalyear.php"
      load={loadFiscalPeriods}
      addTo={{ label: 'New Fiscal Period', to: ROUTES.ledgerFiscalPeriodCreate }}
    />
  )
}
