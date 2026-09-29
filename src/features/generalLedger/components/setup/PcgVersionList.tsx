import { ListTree } from 'lucide-react'
import { LegacyListPage } from '../LegacyListPage'

// accountancy/admin/account.php — the real "List of the accounting accounts"
// (account number, label, parent, group, reconcilable / activated). Adding,
// renaming and deleting accounts is done on the Chart Of Accounts page.
export function PcgVersionList() {
  return <LegacyListPage icon={ListTree} title="Pcg_version" path="/accountancy/admin/account.php" firstHeader={/^Account number/} />
}
