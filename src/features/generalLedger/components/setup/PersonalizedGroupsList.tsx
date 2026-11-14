import { Layers } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { DictListPage } from './DictListPage'
import { loadGroupsList, setGroupActive, deleteGroup } from '../../personalizedGroupsFapi'

// Personalized groups (llx_c_accounting_category, classic accountancy/admin/categories_list.php?id=32), read from
// accountancy/fapi/personalized_groups.php (loadGroupsList); the enable / disable switch is the endpoint's update with active and the delete is its action=delete (both by row id); no classic link is followed.
// The per-row "List of accounts" action (classic: only for a group that is not calculated) opens the accounts of the group.
export function PersonalizedGroupsList() {
  return (
    <DictListPage
      icon={Layers}
      title="Personalized Groups"
      path="/accountancy/admin/categories_list.php?id=32"
      source={{ load: loadGroupsList, setActive: setGroupActive, remove: deleteGroup }}
      columns={['Code', 'Label', 'Comment', 'Calculated', 'Formula', 'Position', 'Country']}
      rowLink={(r) => (/^no$/i.test(r.cells[3] ?? '') ? { to: ROUTES.ledgerPersonalizedGroupAccounts.replace(':id', r.rowid), title: 'List of accounts' } : null)}
    />
  )
}
