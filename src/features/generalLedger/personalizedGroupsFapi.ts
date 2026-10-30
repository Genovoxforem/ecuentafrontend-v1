import { fapiGet } from '../../api/fapiEnvelope'
import type { DictRow } from './dolibarrDictParser'

// accountancy/fapi/personalized_groups.php (reads): a custom account group (llx_c_accounting_category) and the chart accounts linked to it,
// the legacy "List of accounts" page (accountancy/admin/categories.php?action=display&account_category=N). Captured from newecuenta on
// 27 Oct 2026 (tests/fixtures/accountancy-personalized-groups.json, -group-members.json). Adding and removing accounts
// (?action=add_accounts / remove_account) and the group edit / toggle / delete are writes whose request bodies the document does not give and
// that were not run on the live server, so the page that uses these reads shows the accounts only.
const PATH = '/accountancy/fapi/personalized_groups.php'

export interface FapiPersonalizedGroup {
  id: number
  code: string
  label: string
  range_account: string
  // 1 = calculated from a formula of other groups (no accounts of its own), 0 = made of accounts.
  category_type: number
  formula: string
  position: number
  country_code: string
  country: string
  active: number
  memberCount: number
}

export interface FapiGroupMember {
  id: number
  account_number: string
  label: string
}

export interface GroupAccounts {
  group: { id: number; code: string; label: string; calculated: boolean; formula: string; country: string; active: boolean }
  accounts: Array<{ number: string; label: string }>
}

export function mapGroupAccounts(group: FapiPersonalizedGroup, members: FapiGroupMember[]): GroupAccounts {
  return {
    group: {
      id: group.id,
      code: group.code,
      label: group.label,
      calculated: group.category_type === 1,
      formula: group.formula,
      country: group.country_code ? `${group.country_code} - ${group.country}` : group.country,
      active: group.active === 1,
    },
    accounts: members.map((m) => ({ number: m.account_number, label: m.label })),
  }
}

// The classic list (accountancy/admin/categories_list.php?id=32) as DictListPage rows: Code, Label, Comment, Calculated, Formula,
// Position, Country ("IN - India"), in the classic page's order (by id). Activating / deactivating and deleting still follow the classic
// page's own links (personalized_groups.php?action=update cannot change the active flag), built the way that page prints them.
const LEGACY_LIST = '/accountancy/admin/categories_list.php'
const legacyLink = (g: FapiPersonalizedGroup, action: 'enable' | 'disable' | 'delete') =>
  `${LEGACY_LIST}?sortfield=&sortorder=&rowid=${g.id}&code=${encodeURIComponent(g.code)}&&id=32&action=${action}`

export function groupDictRow(g: FapiPersonalizedGroup): DictRow {
  return {
    rowid: String(g.id),
    cells: [g.code, g.label, g.range_account, g.category_type === 1 ? 'Yes' : 'No', g.formula, String(g.position), g.country_code ? `${g.country_code} - ${g.country}` : g.country],
    active: g.active === 1,
    toggleUrl: legacyLink(g, g.active === 1 ? 'disable' : 'enable'),
    deleteUrl: legacyLink(g, 'delete'),
  }
}

export async function loadGroupsList(): Promise<DictRow[]> {
  const d = await fapiGet<{ items: FapiPersonalizedGroup[] }>(PATH, { limit: 500 })
  return [...d.items].sort((a, b) => a.id - b.id).map(groupDictRow)
}

export async function loadGroupAccounts(id: number, signal?: AbortSignal): Promise<GroupAccounts> {
  const [group, members] = await Promise.all([
    fapiGet<FapiPersonalizedGroup>(PATH, { action: 'get', id }, signal),
    fapiGet<{ items: FapiGroupMember[] }>(PATH, { action: 'members', id }, signal),
  ])
  return mapGroupAccounts(group, members.items)
}
