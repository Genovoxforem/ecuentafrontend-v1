import { fapiGet } from '../../api/fapiEnvelope'
import { loadRemainingPages } from '../../api/paging'

// accountancy/fapi/coa.php?action=list (since 11 Nov 2026): the flat list of accounting accounts the classic admin/account.php prints, paged ({items, pagination
// {page, limit, total, pages}}) and searchable (?search=). Read live on newecuenta: 374 accounts, the classic count.
// The classic list's "Parentcategory" column (e.g. "Non-current assets-Fixed assets", the account's sub-group) is NOT in the answer, and the classic "Group of
// account" is the answer's pcg_type (ASSETS, EXPENSE ...), not its group_of_account (c_accounting_category, empty for 373 of the 374): checked row by row on
// 11 Nov 2026 against accountancy/admin/account.php and accountreport.php (master report).
export interface CoaListRow {
  id: number
  account_number: string
  label: string
  labelshort: string
  account_parent: number
  // "number - label" of the parent account
  parent_account: string
  account_category_id: number
  group_of_account: string
  pcg_type: string
  reconcilable: number
  active: number
  status: string
}

const PAGE = 200

export async function loadAllAccounts(): Promise<CoaListRow[]> {
  const read = (page: number) => fapiGet<{ items: CoaListRow[]; pagination: { pages: number } }>('/accountancy/fapi/coa.php', { action: 'list', limit: PAGE, page })
  const first = await read(1)
  const rest = await loadRemainingPages(first.pagination.pages, async (page) => (await read(page)).items)
  return first.items.concat(...rest)
}

// The classic list prints the parent's number only ("101"), the answer gives "101 - Fixed assets".
export const parentNumber = (parentAccount: string): string => parentAccount.split(' - ')[0]
