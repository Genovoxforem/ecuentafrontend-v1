import { Scale } from 'lucide-react'
import { InertListPage } from '../../../shared/components/forms/InertListPage'

// accountancy/bookkeeping/balance.php — classic server-rendered list over
// llx_accounting_bookkeeping grouped by account, no JSON (its CSV export
// streams a raw file server-side, also not JSON). Columns match the real
// page's own arrayfields exactly.
export function AccountBalancePage() {
  return (
    <InertListPage
      icon={Scale}
      title="Account Balance"
      sourcePath="accountancy/bookkeeping/balance.php"
      columns={['Account Accounting', 'Opening Balance', 'Debit', 'Credit', 'Balance']}
    />
  )
}
