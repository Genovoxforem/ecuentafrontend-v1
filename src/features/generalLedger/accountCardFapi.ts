import { fapiGet } from '../../api/fapiEnvelope'

// accountancy/fapi/coa.php?action=account&id=N: one accounting account (tests/fixtures/accountancy-coa-account.json). The rows
// are the ones the classic card (accountancy/admin/card.php) prints, in its order: Label, Short label, Parent account as
// "number - label", Personalized groups, Group of account. An unknown or other-entity id answers 404 "Account not found".

export interface FapiCoaAccount {
  id: number
  account_number: string
  label: string
  labelshort: string
  account_parent: number
  account_parent_number?: string
  account_parent_label?: string
  account_category: number
  account_category_label?: string
  pcg_type: string
  active: number
  status: string
  usage?: { ledger_entries: number; child_accounts: number; can_delete: boolean }
}

export interface AccountCard {
  id: number
  accountNumber: string
  // "Enabled" / "Disabled" as the backend labels it.
  status: string
  rows: { label: string; value: string }[]
}

export function mapAccountCard(d: FapiCoaAccount): AccountCard {
  const parent = d.account_parent && d.account_parent_number ? `${d.account_parent_number} - ${d.account_parent_label ?? ''}`.trim() : ''
  return {
    id: d.id,
    accountNumber: d.account_number,
    status: d.status,
    rows: [
      { label: 'Label', value: d.label },
      { label: 'Short label', value: d.labelshort },
      { label: 'Parent account', value: parent },
      { label: 'Personalized groups', value: d.account_category_label ?? '' },
      { label: 'Group of account', value: d.pcg_type },
    ],
  }
}

export const loadAccountCard = async (id: string, signal?: AbortSignal) =>
  mapAccountCard(await fapiGet<FapiCoaAccount>('/accountancy/fapi/coa.php', { action: 'account', id }, signal))
