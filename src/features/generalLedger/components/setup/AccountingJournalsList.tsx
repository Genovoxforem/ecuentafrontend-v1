import { BookOpen } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/admin/journals_list.php?id=35 — a generic Dolibarr dictionary
// table (llx_accounting_journal), classic form-POST add/modify/delete, no
// JSON. Columns match the real table exactly.
export function AccountingJournalsList() {
  return <InertListPage icon={BookOpen} title="Accounting Journals" sourcePath="accountancy/admin/journals_list.php?id=35" columns={['Code', 'Label', 'Nature Of Journal', 'Status', 'Action']} />
}
