import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText, parseLegacyJson } from '../../shared/legacyHtmlFetch'

// The two ZRA actions that run against the live ZRA gateway, wired to the same
// requests the backend's own pages send (custom/zra/zraindex.php and
// product/stock/movement_listunuploaded.php).

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

// "Sync to ZRA" on Pending Sales Invoices: the ticked invoices (their ids) are posted to compta/facture/pendingsales.php
// with action=sync_zra and the token the page prints for that call, which sends each one to the ZRA gateway and answers
// { ok, success, failed, total, results: [{ id, ref, ok, msg }] } (the page's own syncSelectedToZra()).
export interface PendingSalesSyncResult {
  ok: boolean
  success: number
  failed: number
  total: number
  results: Array<{ id: number; ref?: string; ok: boolean; msg?: string }>
}

const PENDING_SALES_PAGE = '/compta/facture/pendingsales.php'

async function pendingSalesToken(): Promise<string> {
  const html = await fetchLegacyText(PENDING_SALES_PAGE)
  const fromScript = /action:\s*'sync_zra',\s*token:\s*'([^']+)'/.exec(html)?.[1]
  const fromMeta = /<meta name="anti-csrf-currenttoken" content="([^"]+)"/.exec(html)?.[1]
  const token = fromScript ?? fromMeta ?? ''
  if (!token) throw new Error('Could not read the backend session token — sign out and back in, then retry.')
  return token
}

export function useSyncPendingSalesToZra() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false, // never re-submit invoices to the gateway automatically
    mutationFn: async (ids: number[]): Promise<PendingSalesSyncResult> => {
      const body = new URLSearchParams({ action: 'sync_zra', token: await pendingSalesToken() })
      for (const id of ids) body.append('toselect[]', String(id))
      const res = await fetch(PENDING_SALES_PAGE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<Partial<PendingSalesSyncResult>>(res)
      if (typeof data.total !== 'number') throw new Error('The backend did not report a result for the sync.')
      return { ok: !!data.ok, success: Number(data.success) || 0, failed: Number(data.failed) || 0, total: data.total, results: data.results ?? [] }
    },
    // Synced invoices leave the pending list.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['zra', 'pending-sales'] }),
  })
}

// The per-row refresh the backend prints in the ZRA status cell for some errors: fnupdatezrainvoice(ref) posts
// quicklinks_ajax.php type=getzraresponseinvoice&cisInvcNo=<ref>, which re-fetches the invoice's stored ZRA response;
// the page then reloads the list (the invoice drops out once its upload error is cleared).
export function useRefreshZraInvoiceResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (ref: string): Promise<void> => {
      const res = await fetch('/quicklinks_ajax.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams({ type: 'getzraresponseinvoice', cisInvcNo: ref }),
      })
      if (!res.ok) throw new Error(`Failed to refresh ZRA response for invoice #${ref}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['zra', 'pending-sales'] }),
  })
}
