import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { requireJson } from '../salesOrders/orderApi'
import type { DefaultAccountsPage } from './defaultAccountsParser'
import { mapDefaultAccountsFapi, type FapiDefaultAccounts } from './defaultAccountsFapi'

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
      // accountancy/fapi/coa.php?action=tree answers the same bare array as the old fetch.php, so the tree renders unchanged.
      return requireJson(await fapi.get<CoaNode[]>('/accountancy/fapi/coa.php', { params: { action: 'tree' } })).data
    },
    staleTime: 1000 * 30,
  })
}

interface CoaSaveResult {
  status: 200 | 300 | 500
  message?: string
}

// coa.php?action=delete answers a bare [{ status }] array like updatecoa.php did: 300 means the account has children or ledger rows.
async function deleteCoaAccount(id: number): Promise<CoaSaveResult> {
  const data = requireJson(await fapi.post<CoaSaveResult[]>('/accountancy/fapi/coa.php', { id }, { params: { action: 'delete' } })).data
  return data[0] ?? { status: 500 }
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
      // `text` is "<account_number>-<label>"; account_save needs the number and the label apart.
      const cut = text.indexOf('-')
      await fapiPost('/accountancy/fapi/coa.php', { id, account_number: cut < 0 ? '' : text.slice(0, cut).trim(), label: (cut < 0 ? text : text.slice(cut + 1)).trim() }, { action: 'account_save' })
      return { status: 200 as const }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'chartOfAccounts'] }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteCoaAccount(id)
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
      // With an account number the account goes through coa.php?action=account_save. Without one the old page derived the number from the
      // parent's, which the endpoint does not do, so that case still goes through updatecoa.php.
      if (input.accountNumber.trim()) {
        await fapiPost('/accountancy/fapi/coa.php', { account_number: input.accountNumber.trim(), label: input.label, labelshort: input.labelshort, account_parent: input.accountParentId }, { action: 'account_save' })
        return { status: 200 as const }
      }
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

// ── Default Accounts (accountancy/fapi/default_accounts.php) ────────────
// Key-authenticated JSON (the classic defaultaccounts.php form needs a PHP session and a form token). The answer holds the sections, each
// field's stored account and the chart of accounts as the picker list. Saving posts a map of constant name -> account number: only the
// managed constants are written and an empty value clears one, so the page posts every field with its current value; the answer to the
// save is the refreshed page, which is checked against what was sent.
const DEFAULT_ACCOUNTS_PATH = '/accountancy/fapi/default_accounts.php'
const DEFAULT_ACCOUNTS_KEY = ['generalLedger', 'defaultAccounts'] as const

const fetchDefaultAccounts = async (): Promise<DefaultAccountsPage> => mapDefaultAccountsFapi(await fapiGet<FapiDefaultAccounts>(DEFAULT_ACCOUNTS_PATH))

export function useDefaultAccounts() {
  return useQuery({ queryKey: DEFAULT_ACCOUNTS_KEY, queryFn: fetchDefaultAccounts, staleTime: 1000 * 30 })
}

// `values` = field name -> account number, for every field on the page.
export function useUpdateDefaultAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const saved = mapDefaultAccountsFapi(await fapiPost<FapiDefaultAccounts>(DEFAULT_ACCOUNTS_PATH, values, { action: 'update' }))
      const stored = new Map(saved.sections.flatMap((s) => s.fields).map((f) => [f.name, f.value] as const))
      if (Object.entries(values).some(([name, value]) => stored.get(name) !== value)) throw new Error('The backend did not save these accounts.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DEFAULT_ACCOUNTS_KEY }),
  })
}

// "Set As Default (Reference)": the backend overwrites every managed account with its own reference values (no body).
export function useSetDefaultAccountsToReference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fapiPost<FapiDefaultAccounts>(DEFAULT_ACCOUNTS_PATH, {}, { action: 'set_reference_defaults' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DEFAULT_ACCOUNTS_KEY }),
  })
}
