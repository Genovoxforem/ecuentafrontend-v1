import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiPost } from '../../api/fapiEnvelope'
import { loadBindableAccounts } from './bindingFapi'
import { loadFormOptions } from './pieceFapi'

// accountancy/fapi/create.php (22-23 Oct 2026): one manual transaction under a new piece number, every line written in one database
// transaction. The endpoint wants a valid date, an existing journal, at least one line, an account on each line, no line with both a debit and
// a credit, and a balanced set (422 with errors{field:[message]} otherwise). Its dropdowns come from create.php?action=form_options. The
// piece-number overflow is fixed (checked live 23 Oct 2026: a test entry got piece 1, read back with two lines and was deleted again), so a
// new entry is a transaction of its own. The endpoint takes no per-line currency, so that part of the old form is gone (bug list).

export interface NewLine {
  account: string
  subledger: string
  label: string
  debit: string
  credit: string
}

export const blankLine = (): NewLine => ({ account: '', subledger: '', label: '', debit: '', credit: '' })

const amount = (v: string) => Number(v.replace(/[,\s]/g, '')) || 0

export function totalsOf(lines: NewLine[]) {
  const debit = lines.reduce((t, l) => t + amount(l.debit), 0)
  const credit = lines.reduce((t, l) => t + amount(l.credit), 0)
  return { debit, credit, balanced: debit > 0 && Math.abs(debit - credit) < 0.005 }
}

// The first thing wrong with the form as typed, or null: the same checks the endpoint makes, so the user hears it before the request.
export function checkTransaction(v: { date: string; journal: string; lines: NewLine[] }): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return 'Enter a valid date.'
  if (!v.journal) return 'Select a journal.'
  const used = v.lines.filter((l) => l.account || amount(l.debit) || amount(l.credit))
  if (used.length === 0) return 'Add at least one line.'
  for (const [i, l] of used.entries()) {
    if (!l.account) return `Line ${i + 1}: select an account.`
    if (amount(l.debit) && amount(l.credit)) return `Line ${i + 1}: a line cannot have both a debit and a credit.`
    if (!amount(l.debit) && !amount(l.credit)) return `Line ${i + 1}: enter a debit or a credit.`
  }
  if (!totalsOf(used).balanced) return 'Total debit must equal total credit.'
  return null
}

export function createBody(v: { date: string; journal: string; docRef: string; lines: NewLine[] }) {
  return {
    doc_date: v.date,
    journal: v.journal,
    doc_ref: v.docRef.trim() || undefined,
    lines: v.lines
      .filter((l) => l.account || amount(l.debit) || amount(l.credit))
      .map((l) => ({ account: l.account, subledger_account: l.subledger.trim() || undefined, label: l.label.trim() || undefined, debit: String(amount(l.debit)), credit: String(amount(l.credit)) })),
  }
}

export function useCreateFormOptions() {
  return useQuery({
    queryKey: ['generalLedger', 'createForm', 'fapi'],
    queryFn: async () => {
      const [options, accounts] = await Promise.all([loadFormOptions(), loadBindableAccounts().then((a) => a.map((o) => ({ value: o.label.split(' - ')[0], label: o.label })))])
      return { journals: options.journals.map((j) => ({ value: j.code, label: `${j.code} - ${j.label}` })), accounts }
    },
    staleTime: 60_000,
  })
}

export function useCreateTransactionFapi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: { date: string; journal: string; docRef: string; lines: NewLine[] }): Promise<string> => {
      const res = await fapiPost<{ piece_num: string }>('/accountancy/fapi/create.php', createBody(v))
      return String(res.piece_num)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
