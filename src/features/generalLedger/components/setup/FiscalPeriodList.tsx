import { CalendarRange } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../../routes'

// accountancy/admin/fiscalyear.php — read-only list over
// llx_accounting_fiscalyear; create/edit happens on fiscalyear_card.php
// (classic form-POST, full-page reload, no JSON).
export function FiscalPeriodList() {
  return (
    <InertListPage
      icon={CalendarRange}
      title="Fiscal Period"
      sourcePath="accountancy/admin/fiscalyear.php"
      columns={['Ref', 'Label', 'Date Start', 'Date End', 'Accountancy Entries', 'Accountancy Movements', 'Status', 'Action']}
      addLabel="New Fiscal Period"
      addPath={ROUTES.ledgerFiscalPeriodCreate}
    />
  )
}
