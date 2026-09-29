import { Lock } from 'lucide-react'
import { LegacyFormPage } from '../LegacyFormPage'

// accountancy/admin/closure.php — the real closure settings (profit / loss result accounts and the
// closure journal). The note, labels and order are the backend form's own; Modify posts its
// action=update.
export function ClosureAccountsPage() {
  return <LegacyFormPage icon={Lock} title="Closure accounts" path="/accountancy/admin/closure.php" anchor="ACCOUNTING_RESULT_PROFIT" />
}
