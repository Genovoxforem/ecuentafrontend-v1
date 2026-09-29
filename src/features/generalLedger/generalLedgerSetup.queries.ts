import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { parseDefaultAccountsPage, type DefaultAccountsPage } from './defaultAccountsParser'

// accountancy/admin/accountjstree.php's own page does no server-side query at
// all — the Chart of Accounts tree is loaded entirely client-side from two
// real, independent JSON endpoints: fetch.php (read) and updatecoa.php
// (create/update/delete). Confirmed by reading both directly this session —
// genuine `header('Content-Type: application/json')` + `json_encode(...)`,
// not HTML fragments. Neither is referenced by any other page's own UI in
// this legacy app, so this is the first real wiring of either.

export interface CoaNode {
  id: number
  label: string
  text: string // "<account_number>-<label>", the raw combined string the real tree/save form both use
  account_parent: number | string
  amount: number
  formatted_amount: string
  items?: CoaNode[]
}

export function useChartOfAccountsTree() {
  return useQuery({
    queryKey: ['generalLedger', 'chartOfAccounts'],
    queryFn: async (): Promise<CoaNode[]> => {
      const res = await fetch('/accountancy/admin/fetch.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return res.json()
    },
    staleTime: 1000 * 30,
  })
}

interface CoaSaveResult {
  status: 200 | 300 | 500
  message?: string
}

async function postUpdateCoa(params: URLSearchParams): Promise<CoaSaveResult> {
  const res = await fetch('/accountancy/admin/updatecoa.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data: CoaSaveResult[] = await res.json()
  return data[0] ?? { status: 500 }
}

// `text` here is the real page's own combined "<account_number>-<label>"
// string — updatecoa.php's own `type=update` branch splits it on the first
// "-" and keeps only the label half, exactly reproduced here.
export function useUpdateAccountLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const params = new URLSearchParams({ type: 'update', id: String(id), newText: text })
      const result = await postUpdateCoa(params)
      if (result.status !== 200) throw new Error(result.message || 'Update failed.')
      return result
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'chartOfAccounts'] }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await postUpdateCoa(new URLSearchParams({ type: 'delete', id: String(id) }))
      if (result.status !== 200) throw new Error(result.message || 'Unable to delete this account.')
      return result
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'chartOfAccounts'] }),
  })
}

export interface NewAccountInput {
  label: string
  labelshort: string
  accountParentId: number // 0 for a top-level account
  accountParentText: string // parent's own "<account_number>-<label>" string, used server-side to derive the new account number's prefix
  accountNumber: string // optional manual override; left blank to auto-derive from the parent
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewAccountInput) => {
      const params = new URLSearchParams({
        type: 'button-save-coa',
        label: input.label,
        labelshort: input.labelshort,
        account_parent: String(input.accountParentId),
        account_parent_name: input.accountParentText,
      })
      if (input.accountNumber.trim()) params.set('account_number', input.accountNumber.trim())
      const result = await postUpdateCoa(params)
      if (result.status !== 200) throw new Error(result.message || 'Create failed.')
      return result
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'chartOfAccounts'] }),
  })
}

// ── Default Accounts (accountancy/admin/defaultaccounts.php) ────────────
// A classic form page with no JSON. Reading is the page itself (defaultAccountsParser.ts: its
// sections, labels, the chart of accounts as options, and every field's stored account).
// Saving is the form's own POST — and that POST sets EVERY listed constant, blank when
// missing, so it always carries all fields with their current values. Both writes are
// confirmed by reading the page again, since the backend answers with the whole page.
const DEFAULT_ACCOUNTS_PATH = '/accountancy/admin/defaultaccounts.php'
const DEFAULT_ACCOUNTS_KEY = ['generalLedger', 'defaultAccounts'] as const

const fetchDefaultAccounts = async (): Promise<DefaultAccountsPage> => parseDefaultAccountsPage(await fetchLegacyDocument(DEFAULT_ACCOUNTS_PATH))

export function useDefaultAccounts() {
  return useQuery({ queryKey: DEFAULT_ACCOUNTS_KEY, queryFn: fetchDefaultAccounts, staleTime: 1000 * 30 })
}

// `values` = field name -> account number, for every field on the page.
export function useUpdateDefaultAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const before = await fetchDefaultAccounts()
      const body = new URLSearchParams({ token: before.token, action: 'update', ...values })
      await legacyAdminSend(DEFAULT_ACCOUNTS_PATH, { method: 'POST', body })
      const saved = new Map(
        (await fetchDefaultAccounts()).sections.flatMap((s) => s.fields).map((f) => [f.name, f.value] as const),
      )
      if (Object.entries(values).some(([name, value]) => saved.get(name) !== value)) throw new Error('The backend did not save these accounts.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DEFAULT_ACCOUNTS_KEY }),
  })
}

// "Set As Default (Reference)": the page's second form, which overwrites the accounts with the
// backend's own reference values and redirects back.
export function useSetDefaultAccountsToReference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { token } = await fetchDefaultAccounts()
      const body = new URLSearchParams({ token, action: 'set_reference_defaults', button_set_reference_defaults: '1' })
      await legacyAdminSend(DEFAULT_ACCOUNTS_PATH, { method: 'POST', body })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DEFAULT_ACCOUNTS_KEY }),
  })
}
