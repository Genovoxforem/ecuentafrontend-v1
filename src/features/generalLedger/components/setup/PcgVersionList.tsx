import { ListTree } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { loadAllAccounts, parentNumber } from '../../accountList.data'
import type { LegacyCell, LegacyTable } from '../../legacyTable'
import { JsonListPage } from '../JsonListPage'

// Pcg_version: the sidebar entry of the classic app opens the list of the accounting accounts (admin/account.php, 374 rows on newecuenta), read from
// accountancy/fapi/coa.php?action=list. Columns as the classic list prints them, except "Parentcategory" (the sub-group, not in the answer) and the enable /
// reconcilable toggles and Modify / Delete links (the endpoint has no enable / disable action, and the card opens from the account number). The chart
// versions list (coa.php?action=pcg_version) is a different list and is not on this page.
const cell = (text: string, checkId: string | null = null): LegacyCell => ({ text, href: null, checkId })

async function loadAccountList(): Promise<LegacyTable> {
  const rows = await loadAllAccounts()
  return {
    headers: ['Account number', 'Label', 'Short label', 'Parent account', 'Group of account', 'Reconcilable', 'Activated'],
    filters: [null, null, null, null, null, null, null],
    // the id rides in the first cell so the number can open the account card
    rows: rows.map((a) => [cell(a.account_number, String(a.id)), cell(a.label), cell(a.labelshort), cell(parentNumber(a.parent_account)), cell(a.pcg_type), cell(a.reconcilable ? 'Yes' : 'No'), cell(a.active ? 'Yes' : 'No')]),
    totals: [],
    fields: {},
  }
}

export function PcgVersionList() {
  return (
    <JsonListPage
      icon={ListTree}
      title="Pcg_version"
      queryKey="/accountancy/fapi/coa.php?action=list"
      load={loadAccountList}
      searchable
      noFilters
      linkFor={(header, _cell, row) => (header === 'Account number' && row[0].checkId ? ROUTES.ledgerAccountCard.replace(':id', row[0].checkId) : null)}
    />
  )
}
