import { Receipt } from 'lucide-react'
import { DictListPage } from './DictListPage'

// admin/dict.php?id=7 — real, scraped rows (llx_c_chargesociales, social/tax
// contributions) — see dolibarrDictParser.ts's own top comment.
export function TaxAccountsList() {
  return <DictListPage icon={Receipt} title="Tax Accounts" path="/admin/dict.php?id=7" columns={['Code', 'Label', 'Country', 'Accountancy Code', 'Deductible']} />
}
