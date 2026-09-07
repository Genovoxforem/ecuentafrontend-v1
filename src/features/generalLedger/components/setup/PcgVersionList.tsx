import { ListTree } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// accountancy/admin/account.php ("Pcg_version" in the real menu, "Chart Of
// Account" as the page's own title) — a classic server-rendered list over
// llx_accounting_account, no JSON for the grid itself (its bolted-on "ADD
// COA" panel does share the real updatecoa.php write already wired on the
// Chart Of Accounts tree page — that's the one to use for real changes).
export function PcgVersionList() {
  return (
    <InertListPage
      icon={ListTree}
      title="Pcg_version"
      sourcePath="accountancy/admin/account.php"
      columns={['Account Number', 'Label', 'Label To Show', 'Account Parent', 'Parent Category', 'Pcg Type', 'Activated', 'Action']}
      note="This flat list view has no JSON API of its own; use Chart Of Accounts for real, wired add/rename/delete."
    />
  )
}
