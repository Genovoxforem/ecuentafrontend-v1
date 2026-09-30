import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseExpenseReportDocuments, parseExpenseReportNotes, parseExpenseReportEvents, parseExpenseReportLedger } from './expenseReportTabsParser'

export function useExpenseReportDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['expenseReports', 'documents', id],
    queryFn: async () => parseExpenseReportDocuments(await fetchLegacyDocument('/expensereport/document.php', new URLSearchParams({ id: id ?? '' }))),
    enabled: Boolean(id),
  })
}

// Multipart POST to the real action=sendit handler in
// core/actions_linkedfiles.inc.php (included by expensereport/document.php)
// — real fields confirmed live against 172.16.5.10 (id=6): token/
// section_dir/section_id/sortfield/sortorder/max_file_size/userfile[]/
// sendit, plus savingdocmask when the "save with name..." checkbox is
// checked. A real file upload, not a mock — verified the uploaded file
// actually appears in the real "Attached files and documents" list
// afterward. `savingdocmask` must be sent as its real scraped value (a
// filename-template string), not a plain "on" — confirmed live that doing
// so breaks the upload (produces a file with no extension).
export function useUploadExpenseReportDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; file: File; savingDocMask: string; useMask: boolean }) => {
      const body = new FormData()
      body.set('token', input.token)
      body.set('section_dir', '')
      body.set('section_id', '0')
      body.set('sortfield', '')
      body.set('sortorder', '')
      body.set('max_file_size', '536870912')
      body.set('userfile[]', input.file)
      body.set('sendit', 'Upload')
      if (input.useMask) body.set('savingdocmask', input.savingDocMask)
      const res = await fetch(`/expensereport/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseReports', 'documents', id] }),
  })
}

// GET to the real action=confirm_deletefile handler (not the plain
// action=deletefile the row's own link carries — that one only opens a
// client-side confirm dialog on the real page; the dialog's own submit is
// what actually appends confirm=yes and rewrites the action, per Dolibarr's
// standard 2-step delete convention). Same rewrite already established and
// verified working in OrderDetailShared.tsx's deleteOrderDocument; verified
// again here live (uploaded then deleted a real test file against id=6).
export function useDeleteExpenseReportDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deleteUrl: string) => {
      const url = deleteUrl.replace('action=deletefile', 'action=confirm_deletefile') + '&confirm=yes'
      const res = await fetch(url, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseReports', 'documents', id] }),
  })
}

export function useExpenseReportNotes(id: string | undefined) {
  return useQuery({
    queryKey: ['expenseReports', 'notes', id],
    queryFn: async () => parseExpenseReportNotes(await fetchLegacyDocument('/expensereport/note.php', new URLSearchParams({ id: id ?? '' }))),
    enabled: Boolean(id),
  })
}

// expensereport/note.php's real action=setnote_public/setnote_private
// handler — confirmed live (172.16.5.10, id=1): a plain textarea form-POST,
// token/id/action/note_public(or note_private)/modify=Modify.
export function useSaveExpenseReportNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; field: 'public' | 'private'; html: string }) => {
      const body = new URLSearchParams({
        token: input.token,
        id: id ?? '',
        action: `setnote_${input.field}`,
        [`note_${input.field}`]: input.html,
        modify: 'Modify',
      })
      const res = await fetch('/expensereport/note.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseReports', 'notes', id] }),
  })
}

export function useExpenseReportEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['expenseReports', 'events', id],
    queryFn: async () => parseExpenseReportEvents(await fetchLegacyDocument('/expensereport/info.php', new URLSearchParams({ id: id ?? '' }))),
    enabled: Boolean(id),
  })
}

export function useExpenseReportLedger(id: string | undefined) {
  return useQuery({
    queryKey: ['expenseReports', 'ledgerentry', id],
    queryFn: async () => parseExpenseReportLedger(await fetchLegacyDocument('/expensereport/ledgerentry.php', new URLSearchParams({ id: id ?? '' }))),
    enabled: Boolean(id),
  })
}
