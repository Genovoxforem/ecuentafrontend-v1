import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import { requireJson } from '../salesOrders/orderApi'

// Rebate invoices (value credit notes) on custom/zra/fapi/rebate_list.php (sync) and rebate_create.php (create), key-authenticated JSON.
// The classic pages (custom/zra/rebate_list.php, rebate_create.php, rebate_ajax.php) and the HTML / CSRF-token reads that went with them are
// gone; the Create form's reads are in rebateCreateForm.data.ts.

// ── Sync selected rebates to ZRA ───────────────────────────────────────────
// The list page's "Sync selected to ZRA" button: POST rebate_ajax.php with
// action=sync, the session's CSRF token and ids[0..n]; answered with
// { ok, error?, results: [{ id, ok, code, message }], synced, total }.
export interface RebateSyncOutcome {
  id: string
  ok: boolean
  code: string
  message: string
}
export interface RebateSyncResult {
  synced: number
  total: number
  results: RebateSyncOutcome[]
}

// custom/zra/fapi/rebate_list.php action=sync {ids} (max 50 per call): the same module code
// as the classic ajax (RebateInvoice::validate() / zra_submit_rebate_invoice()), but
// key-authenticated, so no CSRF token has to be scraped from the list page. Each row carries
// ZRA's own code ("000" = success); a non-zero code is ZRA's answer, not a failure of the call.
// The response shape is not published yet, so rows are read by their likely names.
const SYNC_BATCH = 50

type FapiSyncRow = {
  id?: string | number
  rebate_id?: string | number
  ok?: boolean
  success?: boolean
  code?: string | number
  zra_code?: string | number
  message?: string
  zra_message?: string
}

async function syncViaFapi(ids: string[]): Promise<RebateSyncResult> {
  const results: RebateSyncOutcome[] = []
  let synced = 0
  for (let i = 0; i < ids.length; i += SYNC_BATCH) {
    const chunk = ids.slice(i, i + SYNC_BATCH).map(Number)
    const res = requireJson(
      await fapi.post('/custom/zra/fapi/rebate_list.php', { action: 'sync', ids: chunk }, { params: { action: 'sync' }, validateStatus: () => true }),
    )
    const body = res.data as { success?: boolean; message?: string; data?: { synced?: number; results?: FapiSyncRow[]; items?: FapiSyncRow[] } }
    if (!body.success) throw new Error(body.message || 'Sync failed')
    const rows = body.data?.results ?? body.data?.items ?? []
    const mapped = rows.map((r) => {
      const code = String(r.code ?? r.zra_code ?? '')
      return { id: String(r.id ?? r.rebate_id ?? ''), ok: r.ok ?? r.success ?? code === '000', code, message: r.message ?? r.zra_message ?? '' }
    })
    results.push(...mapped)
    synced += body.data?.synced ?? mapped.filter((r) => r.ok).length
  }
  return { synced, total: ids.length, results }
}

export function useSyncRebates() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false, // a sync is a real submission to the ZRA gateway
    mutationFn: (ids: string[]): Promise<RebateSyncResult> => syncViaFapi(ids),
    // The list shows each rebate's ZRA status and message, which the sync changes.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['zra', 'rebates', 'list'] })
    },
  })
}

// ── Create Rebate Invoice ──────────────────────────────────────────────────
export interface CreateRebateInput {
  socid: string
  percentage: string
  reason: string
  invoiceIds: string[]
}

// POST custom/zra/fapi/rebate_create.php {socid, selected_invoices, rebate_percentage, rebate_reason}. The rebate is left as a draft; the next step
// is the sync.
export function useCreateRebate() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: CreateRebateInput): Promise<string> => {
      const res = requireJson(
        await fapi.post(
          '/custom/zra/fapi/rebate_create.php',
          {
            socid: Number(input.socid),
            selected_invoices: input.invoiceIds.map(Number),
            rebate_percentage: Number(input.percentage),
            rebate_reason: input.reason,
          },
          { validateStatus: () => true },
        ),
      )
      const reply = res.data as { success?: boolean; message?: string; errors?: unknown }
      if (!reply.success) {
        const detail =
          reply.errors && !Array.isArray(reply.errors)
            ? Object.values(reply.errors as Record<string, unknown>)
                .flat()
                .join(' ')
            : ''
        throw new Error(reply.message || detail || 'Could not create the rebate.')
      }
      return reply.message || 'Rebate created as a draft. Sync it to ZRA next.'
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zra', 'rebates', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['zra', 'rebateCreate'] })
    },
  })
}

// custom/zra/fapi/rebate_list.php answers 409 "Value Credit Notes are not enabled on this
// instance" when ZRA_REBATE_ENABLED is off (the same gate the classic pages apply). Asking
// it first means a disabled install says so at once. Any other answer leaves the page to try.
export function useRebatesEnabled() {
  return useQuery({
    queryKey: ['zra', 'rebates', 'enabled'],
    queryFn: async (): Promise<{ enabled: boolean; message: string }> => {
      try {
        const res = await fapi.get('/custom/zra/fapi/rebate_list.php', {
          params: { limit: 1 },
          validateStatus: (status) => status === 409 || (status >= 200 && status < 300),
        })
        if (res.status === 409) {
          const message = (res.data as { message?: string } | undefined)?.message
          return { enabled: false, message: message || 'Value Credit Notes are not enabled on this instance.' }
        }
      } catch {
        // endpoint missing or unreachable: the page tries anyway
      }
      return { enabled: true, message: '' }
    },
    staleTime: 1000 * 60 * 5,
  })
}
