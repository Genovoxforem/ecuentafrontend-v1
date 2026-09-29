import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseExpenseCard, type ExpenseCardPage } from './expenseCardParser'
import { postExpenseAction } from './expenses.queries'

// expense/card.php as a fragment (expense/api/expense_content.php?action=card&id=N).
export function useExpenseCard(id: string | undefined) {
  return useQuery({
    queryKey: ['expenses', 'card', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ExpenseCardPage> => {
      const res = await fetch(`/expense/api/expense_content.php?action=card&ajax=1&id=${encodeURIComponent(id ?? '')}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const body = await res.text()
      if (looksLikeLegacyLoginPageText(body)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      let json: { success?: boolean; message?: string; html?: string }
      try {
        json = JSON.parse(body)
      } catch {
        throw new Error('The expense page did not answer as expected.')
      }
      if (!json.success) throw new Error(json.message || 'The expense could not be loaded.')
      const card = parseExpenseCard(json.html ?? '')
      if (!card) {
        // The backend prints its own reason ("Expense not found", "Access denied") as an alert.
        const reason = new DOMParser()
          .parseFromString(json.html ?? '', 'text/html')
          .querySelector('.alert')
          ?.textContent?.trim()
        throw new Error(reason || 'This expense could not be found.')
      }
      return card
    },
  })
}

// What the button bar's confirm dialogs do: expense/api/expense.php action=changeStatus (`status` is the
// backend's word for it) or action=set_paid.
export type ExpenseStatusAction = 'validate' | 'setDraft' | 'approve' | 'deny' | 'cancel' | 'markPaid'
const STATUS_WORD: Record<Exclude<ExpenseStatusAction, 'markPaid'>, string> = { validate: 'validate', setDraft: 'reopen', approve: 'approve', deny: 'refuse', cancel: 'cancel' }

export function useExpenseStatusAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ action, comment }: { action: ExpenseStatusAction; comment: string }) => {
      const json = action === 'markPaid' ? await postExpenseAction('set_paid', { id, comment }) : await postExpenseAction('changeStatus', { id, status: STATUS_WORD[action], comment })
      if (!json.success) throw new Error(json.message || 'The action was refused.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// Only a draft can be deleted (the backend refuses anything else).
export function useDeleteExpense(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const json = await postExpenseAction('delete', { id })
      if (!json.success) throw new Error(json.message || 'Could not delete the expense report.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// A new draft with the same lines, for the chosen employee. Resolves to the new report's id.
export function useCloneExpense(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string): Promise<string> => {
      const json = await postExpenseAction('clone', { id, fk_user_author: userId })
      const newId = json.data?.new_id
      if (!json.success || !newId) throw new Error(json.message || 'Could not clone the expense report.')
      return String(newId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// ── Documents (expense/api/documents.php) ───────────────────────────────────────────────────────────
export interface ExpenseDocument {
  name: string
  size: string
  date: string
  ext: string
  downloadUrl: string
  thumbUrl: string
}
export interface ExpenseDocuments {
  files: ExpenseDocument[]
  totalSize: string
}

interface RawDocsResponse {
  success: boolean
  message?: string
  data?: {
    files?: { name: string; size_formatted: string; date: string; ext: string; download_url: string; thumb_url: string }[]
    total_size_formatted?: string
  }
}

async function documentsCall(init: { method: 'GET' } | { method: 'POST'; body: FormData }, query = ''): Promise<RawDocsResponse> {
  const res = await fetch(`/expense/api/documents.php${query}`, { credentials: 'same-origin', ...init })
  let json: RawDocsResponse
  try {
    json = await res.json()
  } catch {
    throw new Error(`Legacy backend returned ${res.status}.`)
  }
  if (!json.success) throw new Error(json.message || 'The documents request was refused.')
  return json
}

export function useExpenseDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['expenses', 'documents', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ExpenseDocuments> => {
      const json = await documentsCall({ method: 'GET' }, `?action=list&id=${encodeURIComponent(id ?? '')}`)
      return {
        files: (json.data?.files ?? []).map((f) => ({ name: f.name, size: f.size_formatted, date: f.date, ext: f.ext, downloadUrl: f.download_url, thumbUrl: f.thumb_url })),
        totalSize: json.data?.total_size_formatted ?? '',
      }
    },
  })
}

export function useUploadExpenseDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append('userfile', file)
      body.append('action', 'upload')
      body.append('id', id)
      await documentsCall({ method: 'POST', body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', 'documents', id] }),
  })
}

export function useDeleteExpenseDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filename: string) => {
      const body = new FormData()
      body.append('action', 'delete')
      body.append('id', id)
      body.append('filename', filename)
      await documentsCall({ method: 'POST', body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', 'documents', id] }),
  })
}
