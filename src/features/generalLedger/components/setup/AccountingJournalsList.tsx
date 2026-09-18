import { BookOpen } from 'lucide-react'
import { DictListPage } from './DictListPage'

// accountancy/admin/journals_list.php?id=35 — real, scraped rows (llx_accounting_journal) —
// see dolibarrDictParser.ts's own top comment.
export function AccountingJournalsList() {
  return <DictListPage icon={BookOpen} title="Accounting Journals" path="/accountancy/admin/journals_list.php?id=35" columns={['Code', 'Label', 'Nature Of Journal']} />
}
