import { Layers } from 'lucide-react'
import { DictListPage } from './DictListPage'

// accountancy/admin/categories_list.php?id=32 — real, scraped rows
// (llx_c_accounting_category) — see dolibarrDictParser.ts's own top comment.
// This page's own per-row "List of accounts" 4th action (drill into which
// real accounts belong to that category) isn't reproduced — out of scope
// for the shared generic list.
export function PersonalizedGroupsList() {
  return (
    <DictListPage
      icon={Layers}
      title="Personalized Groups"
      path="/accountancy/admin/categories_list.php?id=32"
      columns={['Code', 'Label', 'Comment', 'Calculated', 'Formula', 'Position', 'Country']}
    />
  )
}
