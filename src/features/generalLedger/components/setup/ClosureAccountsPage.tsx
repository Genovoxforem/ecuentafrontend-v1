import { Lock } from 'lucide-react'
import { LegacyFormPage } from '../LegacyFormPage'
import { loadClosureAccounts, saveClosureAccounts } from '../../setupFormsFapi'

// accountancy/fapi/closure_accounts.php — the real closure settings (profit / loss result accounts and the
// closure journal). Modify posts action=update; the closure journal is required.
export function ClosureAccountsPage() {
  return <LegacyFormPage icon={Lock} title="Closure accounts" path="/accountancy/admin/closure.php" anchor="ACCOUNTING_RESULT_PROFIT" load={loadClosureAccounts} save={saveClosureAccounts} />
}
