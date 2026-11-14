import { Lock } from 'lucide-react'
import { JsonFormPage } from '../JsonFormPage'
import { loadClosureAccounts, saveClosureAccounts } from '../../setupFormsFapi'

// accountancy/fapi/closure_accounts.php — the real closure settings (profit / loss result accounts and the
// closure journal). Modify posts action=update; the closure journal is required.
export function ClosureAccountsPage() {
  return <JsonFormPage icon={Lock} title="Closure accounts" queryKey="/accountancy/admin/closure.php" load={loadClosureAccounts} save={saveClosureAccounts} />
}
