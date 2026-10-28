import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { SubaccountRow } from './components/setup/chartOfIndividualAccounts.types'

// accountancy/fapi/subaccounts.php (23 Oct 2026): the customer, supplier and employee accounting codes. The answer was captured from
// newecuenta on 23 Oct 2026 (tests/fixtures/accountancy-subaccounts.json). `reconcilable` lives only on the chart account whose number equals
// the subledger code, so a code without such a chart account reads false and cannot be toggled (the document says so).

export interface FapiSubaccounts {
  items: Array<{ id: number; socid: number; type: string; typeId: number; accountNumber: string; label: string; reconcilable: boolean; reconcilableAccountId: number | null }>
  pagination: { page: number; limit: number; total: number; pages: number }
}

// `toggleUrl` carries the chart account id the toggle acts on (null when there is none).
export const mapSubaccounts = (d: FapiSubaccounts): SubaccountRow[] =>
  d.items.map((i) => ({
    accountNumber: i.accountNumber,
    label: i.label,
    type: i.type,
    socid: String(i.socid),
    reconcilable: i.reconcilable,
    toggleUrl: i.reconcilableAccountId == null ? null : String(i.reconcilableAccountId),
  }))

export const loadSubaccounts = async () => mapSubaccounts(await fapiGet<FapiSubaccounts>('/accountancy/fapi/subaccounts.php', { limit: 500 }))

export const toggleSubaccountReconcilable = async (accountId: string) => {
  await fapiPost('/accountancy/fapi/subaccounts.php', { accountId: Number(accountId) }, { action: 'toggle_reconcilable' })
}
