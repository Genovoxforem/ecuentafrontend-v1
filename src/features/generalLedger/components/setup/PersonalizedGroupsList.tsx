import { Layers } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { DictListPage } from './DictListPage'

// accountancy/admin/categories_list.php?id=32 — real, scraped rows
// (llx_c_accounting_category) — see dolibarrDictParser.ts's own top comment.
// The per-row "List of accounts" action (classic: only for a group that is not calculated) opens the accounts of the group,
// read from accountancy/fapi/personalized_groups.php.
export function PersonalizedGroupsList() {
  return (
    <DictListPage
      icon={Layers}
      title="Personalized Groups"
      path="/accountancy/admin/categories_list.php?id=32"
      columns={['Code', 'Label', 'Comment', 'Calculated', 'Formula', 'Position', 'Country']}
      rowLink={(r) => (/^no$/i.test(r.cells[3] ?? '') ? { to: ROUTES.ledgerPersonalizedGroupAccounts.replace(':id', r.rowid), title: 'List of accounts' } : null)}
    />
  )
}
