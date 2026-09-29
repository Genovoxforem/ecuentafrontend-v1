import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, parseLegacyJson } from '../../shared/legacyHtmlFetch'

// The two ZRA actions that run against the live ZRA gateway, wired to the same
// requests the backend's own pages send (confirmed live against 172.16.5.10 by
// reading custom/zra/zraindex.php and product/stock/movement_listunuploaded.php).

// Manual Sync — the dashboard's "Run full ZRA synchronization now" button:
// POST custom/zra/zra_run_sync.php with the session's CSRF token, answered with
// { success, duration_sec } or { success: false, error }. The token is the one
// the backend prints in every page's anti-csrf meta tag.
export interface ZraSyncResult {
  durationSec: string
}

async function sessionToken(): Promise<string> {
  const doc = await fetchLegacyDocument('/custom/zra/zraindex.php')
  const token = doc.querySelector<HTMLMetaElement>('meta[name="anti-csrf-currenttoken"]')?.content ?? doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
  if (!token) throw new Error('Could not read the backend session token — sign out and back in, then retry.')
  return token
}

export function useZraManualSync() {
  const queryClient = useQueryClient()
  return useMutation({
    // Not retried: a sync is a real run against the ZRA gateway.
    retry: false,
    mutationFn: async (): Promise<ZraSyncResult> => {
      const token = await sessionToken()
      const res = await fetch('/custom/zra/zra_run_sync.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams({ token }),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ success?: boolean; duration_sec?: number | string; error?: string }>(res)
      if (!data.success) throw new Error(data.error || 'The ZRA sync failed.')
      return { durationSec: data.duration_sec != null ? String(data.duration_sec) : '?' }
    },
    // The dashboard numbers move after a sync.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['zra'] }),
  })
}

// Upload TO ZRA on the un-uploaded stock movements list: the ticked movements
// (their ids) are posted to product/stock/zraallupdatestock.php with
// type=zrastockupload, which sends them to the ZRA gateway and answers
// { status: "<message>" } — the text the backend page itself shows as its toast.
export function useUploadStockMovements() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false, // never re-submit stock to the gateway automatically
    mutationFn: async (ids: string[]): Promise<string> => {
      const body = new URLSearchParams()
      for (const id of ids) body.append('ids[]', id)
      body.set('type', 'zrastockupload')
      const res = await fetch('/product/stock/zraallupdatestock.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ status?: unknown }>(res)
      const status = data.status
      if (status === undefined || status === null || status === '') throw new Error('The backend did not report a result for the upload.')
      return typeof status === 'string' ? status : JSON.stringify(status)
    },
    // The list shows each movement's ZRA status, which the upload changes.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'legacyList'] }),
  })
}
