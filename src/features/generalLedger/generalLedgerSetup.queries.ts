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
