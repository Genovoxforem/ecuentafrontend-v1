import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

// accountancy/admin/openingbalance.php + openingbalance_ajax.php — a real
// JSON write (confirmed: inserts real llx_accounting_bookkeeping rows,
// responds {status:200/500}). No read API exists for what's already been
// entered, so the caller pairs this with a session-local echo list.
export interface OpeningBalanceLine {
  accountNumber: string
  debit: string
  credit: string
}

export function useSaveOpeningBalance() {
  return useMutation({
    mutationFn: async ({ date, lines }: { date: string; lines: OpeningBalanceLine[] }) => {
      const params = new URLSearchParams({ action: 'validate', newdatepicker: date })
      for (const line of lines) {
        params.append('accounts[]', line.accountNumber)
        params.append('debit[]', line.debit || '0')
        params.append('credit[]', line.credit || '0')
      }
      const res = await fetch('/accountancy/admin/openingbalance_ajax.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: CoaSaveResult[] = await res.json()
      if ((data[0]?.status ?? 500) !== 200) throw new Error('The opening balance backend rejected this entry.')
      return data[0]
    },
  })
}

// Flattens the real Chart of Accounts tree into a plain list for use as a
// select's option list (Opening Balance's account picker, etc.).
export function flattenCoaTree(nodes: CoaNode[]): CoaNode[] {
  const out: CoaNode[] = []
  const walk = (list: CoaNode[]) => {
    for (const node of list) {
      out.push(node)
      if (node.items?.length) walk(node.items)
    }
  }
  walk(nodes)
  return out
}

// ── Default Accounts (accountancy/admin/defaultaccounts.php) ────────────
// Classic full-page form, no JSON — confirmed by reading the PHP source
// directly. Every field is a real Dolibarr constant (each <select> is
// FormAccounting::select_account(), the exact same real Chart-of-Accounts
// data already fetched for the CoA tree page above), saved one at a time
// server-side via ecuenta_set_const() when action=update is posted. The 30
// real field names below were confirmed two ways: reading the PHP array
// build logic (list_account_main/list_account) AND cross-checking every
// `name="..."` actually rendered on the live page — the isInEEC()/
// isModEnabled() conditionals in the source mean the true field set can
// only be confirmed by checking the live render, not the source alone.
//
// This form updates 30 fields at once from a single Save click, and each
// field's real POST value defaults to empty string if omitted — submitting
// only the changed field(s) would silently blank out every other one. Per
// this app's established safe-write pattern for this exact shape of
// problem (see userDetailTabs.queries.ts's Leave Types save), a fresh copy
// of the real form is fetched immediately before submit and its real
// FormData is used as the base (carrying every other field's current
// value forward untouched), with only the field(s) the user actually
// changed overridden — never read into React state or displayed, so
// nothing here scrapes the page for display data, only to safely preserve
// what isn't being changed.
export const DEFAULT_ACCOUNT_GROUPS: { heading: string; fields: { key: string; label: string }[] }[] = [
  {
    heading: 'Third Parties | Users',
    fields: [
      { key: 'ACCOUNTING_ACCOUNT_CUSTOMER', label: 'Customer Account' },
      { key: 'ACCOUNTING_ACCOUNT_SUPPLIER', label: 'Supplier Account' },
      { key: 'SALARIES_ACCOUNTING_ACCOUNT_PAYMENT', label: 'Salaries Payment Account' },
    ],
  },
  {
    heading: 'Product',
    fields: [
      { key: 'ACCOUNTING_PRODUCT_SOLD_ACCOUNT', label: 'Product Sold Account' },
      { key: 'ACCOUNTING_PRODUCT_SOLD_EXPORT_ACCOUNT', label: 'Product Sold Account (Export)' },
      { key: 'ACCOUNTING_PRODUCT_BUY_ACCOUNT', label: 'Product Bought Account' },
      { key: 'ACCOUNTING_PRODUCT_BUY_EXPORT_ACCOUNT', label: 'Product Bought Account (Export)' },
    ],
  },
  {
    heading: 'Service',
    fields: [
      { key: 'ACCOUNTING_SERVICE_SOLD_ACCOUNT', label: 'Service Sold Account' },
      { key: 'ACCOUNTING_SERVICE_SOLD_EXPORT_ACCOUNT', label: 'Service Sold Account (Export)' },
      { key: 'ACCOUNTING_SERVICE_BUY_ACCOUNT', label: 'Service Bought Account' },
      { key: 'ACCOUNTING_SERVICE_BUY_EXPORT_ACCOUNT', label: 'Service Bought Account (Export)' },
    ],
  },
  {
    heading: 'Others',
    fields: [
      { key: 'ACCOUNTING_VAT_BUY_ACCOUNT', label: 'VAT Bought Account' },
      { key: 'ACCOUNTING_VAT_SOLD_ACCOUNT', label: 'VAT Sold Account' },
      { key: 'ACCOUNTING_VAT_PAY_ACCOUNT', label: 'VAT Pay Account' },
      { key: 'ACCOUNTING_ACCOUNT_SUSPENSE', label: 'Suspense Account' },
      { key: 'ACCOUNTING_ACCOUNT_TRANSFER_CASH', label: 'Transfer Cash Account' },
      { key: 'DONATION_ACCOUNTINGACCOUNT', label: 'Donation Account' },
      { key: 'ADHERENT_SUBSCRIPTION_ACCOUNTINGACCOUNT', label: 'Subscription Account' },
      { key: 'ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT', label: 'Customer Deposit Account' },
      { key: 'ACCOUNTING_ACCOUNT_CUSTOMER_OPENING', label: 'Customer Opening Account' },
      { key: 'ACCOUNTING_ACCOUNT_CUSTOMER_ADVANCE', label: 'Customer Advance Account' },
      { key: 'ACCOUNTING_ACCOUNT_SUPPLIER_ADVANCE', label: 'Supplier Advance Account' },
      { key: 'ACCOUNTING_ACCOUNT_LEDGER_OPENING', label: 'Ledger Opening Account' },
      { key: 'ACCOUNTING_ACCOUNT_LEDGER_SHIPPING', label: 'Ledger Shipping Account' },
      { key: 'ACCOUNTING_ACCOUNT_CUSTOMER_LOAN', label: 'Customer Loan Account' },
      { key: 'ACCOUNTING_ACCOUNT_CUSTOMER_INTEREST', label: 'Customer Interest Account' },
    ],
  },
  {
    heading: 'Loan Management',
    fields: [
      { key: 'LOAN_ACCOUNTING_ACCOUNT_CAPITAL', label: 'Loan Capital Account' },
      { key: 'LOAN_ACCOUNTING_ACCOUNT_INTEREST', label: 'Loan Interest Account' },
      { key: 'LOAN_ACCOUNTING_ACCOUNT_INSURANCE', label: 'Loan Insurance Account' },
      { key: 'LOAN_ACCOUNTING_ACCOUNT_PENALTY', label: 'Loan Penalty Account' },
    ],
  },
]

async function fetchDefaultAccountsForm(): Promise<{ form: HTMLFormElement; token: string }> {
  const res = await fetch('/accountancy/admin/defaultaccounts.php', { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const form = Array.from(doc.querySelectorAll('form')).find((f) => f.querySelector('input[name="action"][value="update"]'))
  if (!form) throw new Error('Could not find the real Default Accounts form on the legacy page.')
  const token = (form.querySelector('input[name="token"]') as HTMLInputElement | null)?.value ?? ''
  if (!token) throw new Error('Could not find a CSRF token on the Default Accounts page.')
  return { form, token }
}

export function useUpdateDefaultAccounts() {
  return useMutation({
    mutationFn: async (changes: Record<string, string>) => {
      const { form, token } = await fetchDefaultAccountsForm()
      const body = new FormData(form)
      body.set('token', token)
      for (const [key, value] of Object.entries(changes)) body.set(key, value)
      const res = await fetch('/accountancy/admin/defaultaccounts.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
  })
}

export function useSetDefaultAccountsToReference() {
  return useMutation({
    mutationFn: async () => {
      const { token } = await fetchDefaultAccountsForm()
      const body = new URLSearchParams({ token, action: 'set_reference_defaults', button_set_reference_defaults: '1' })
      const res = await fetch('/accountancy/admin/defaultaccounts.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
  })
}
