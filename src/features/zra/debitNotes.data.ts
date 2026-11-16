import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE, parseLegacyJson } from '../../shared/legacyHtmlFetch'

// Debit Notes (custom/zra/debitnote_list.php). The list is read from that page; the
// "Upload selected to ZRA" button is its own script: POST debitnote_ajax.php with
// action=sync, the page's CSRF token and ids[0..n], answered with
// { ok, error?, results: [{ id, ok, code, message }], synced, total }.
// Checked on newecuenta 11 Nov 2026 (read only): no key-authenticated (fapi) route exists for debit notes.

export const DEBIT_NOTES_PATH = '/custom/zra/debitnote_list.php'

export interface DebitNoteSyncOutcome {
  id: string
  ok: boolean
  code: string
  message: string
}
export interface DebitNoteSyncResult {
  synced: number
  total: number
  results: DebitNoteSyncOutcome[]
}

interface RawSyncResponse {
  ok?: boolean
  error?: string
  synced?: number
  total?: number
  results?: { id?: string | number; ok?: boolean; code?: string; message?: string }[]
}

async function listPageToken(): Promise<string> {
  const doc = await fetchLegacyDocument(DEBIT_NOTES_PATH)
  const token = doc.querySelector<HTMLMetaElement>('meta[name="anti-csrf-currenttoken"]')?.content ?? doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
  if (!token) throw new Error('Could not read the backend session token — sign out and back in, then retry.')
  return token
}

async function syncDebitNotes(ids: string[]): Promise<DebitNoteSyncResult> {
  const token = await listPageToken()
  const body = new URLSearchParams({ action: 'sync', token })
  ids.forEach((id, i) => body.set(`ids[${i}]`, id))
  const res = await fetch('/custom/zra/debitnote_ajax.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body,
  })
  let data: RawSyncResponse
  try {
    data = await parseLegacyJson<RawSyncResponse>(res)
  } catch (e) {
    if (e instanceof Error && e.message === NOT_SIGNED_IN_MESSAGE) throw e
    throw new Error(res.ok ? 'The backend did not answer the upload request.' : `Legacy backend returned ${res.status}.`)
  }
  if (!data.ok) throw new Error(data.error || 'Upload failed')
  const results = (data.results ?? []).map((r) => ({ id: String(r.id ?? ''), ok: !!r.ok, code: r.code ?? '', message: r.message ?? '' }))
  return { synced: data.synced ?? results.filter((r) => r.ok).length, total: data.total ?? results.length, results }
}

export function useSyncDebitNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false, // an upload is a real submission to the ZRA gateway
    mutationFn: (ids: string[]) => syncDebitNotes(ids),
    // Each row's ZRA Status / ZRA Message change with the upload.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['generalLedger', 'legacyList'] })
    },
  })
}
