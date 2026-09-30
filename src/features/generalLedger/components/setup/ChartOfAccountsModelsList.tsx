import { BookMarked } from 'lucide-react'
import { DictListPage } from './DictListPage'

// accountancy/admin/accountmodel.php?id=31 — real "Chart of accounts models"
// (llx_accounting_system): 37 rows on the dev backend, columns Code / Label /
// Country, and exactly one model activated (its status link is action=disable,
// every other row's is action=activate). Same generic dictionary template as
// the other setup lists, so it reuses DictListPage.
export function ChartOfAccountsModelsList() {
  return <DictListPage icon={BookMarked} title="Chart Of Accounts Models" path="/accountancy/admin/accountmodel.php?id=31" columns={['Chart Of Accounts Models', 'Label', 'Country']} />
}
