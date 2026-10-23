import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// accountancy/fapi/journals_admin.php (22-23 Oct 2026): the accounting journals (llx_accounting_journal, per entity) with create, delete and
// toggle_active. The list answer was captured from newecuenta on 22 Oct 2026 (nine journals). The writes are "representative" in the document
// and were not run; update is not described, so editing a journal stays off.
const PATH = '/accountancy/fapi/journals_admin.php'
const KEY = ['generalLedger', 'journalsAdmin'] as const

export interface FapiJournalAdmin {
  id: number
  code: string
  label: string
  nature: number
  natureLabel: string
  active: number
}

export interface JournalAdminRow {
  id: string
  code: string
  label: string
  natureLabel: string
  active: boolean
}

export const NATURES: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Miscellaneous operations' },
  { value: 2, label: 'Sales' },
  { value: 3, label: 'Purchases' },
  { value: 4, label: 'Bank' },
  { value: 5, label: 'Expense report' },
  { value: 8, label: 'Inventory' },
  { value: 9, label: 'Has-new' },
]

export const mapJournalsAdmin = (d: { items: FapiJournalAdmin[] }): JournalAdminRow[] =>
  d.items.map((j) => ({ id: String(j.id), code: j.code, label: j.label, natureLabel: j.natureLabel, active: j.active === 1 }))

export function useJournalsAdmin() {
  return useQuery({ queryKey: [...KEY, 'fapi'], queryFn: async () => mapJournalsAdmin(await fapiGet<{ items: FapiJournalAdmin[] }>(PATH, { limit: 500 })) })
}

export function useCreateJournal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { code: string; label: string; nature: number }) => fapiPost(PATH, { code: v.code.trim(), label: v.label.trim(), nature: v.nature }, { action: 'create' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useToggleJournal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fapiPost(PATH, { id: Number(id) }, { action: 'toggle_active' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteJournal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fapiPost(PATH, { id: Number(id) }, { action: 'delete' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
