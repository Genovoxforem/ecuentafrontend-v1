import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchLegacyDocument,
  legacyMissingContentError,
  looksLikeLegacyLoginPageText,
  NOT_SIGNED_IN_MESSAGE,
  parseLegacyJson,
} from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { cellText } from '../generalLedger/legacyTable'

// Rebate invoices (value credit notes) — custom/zra/rebate_list.php,
// rebate_create.php and rebate_ajax.php. Read from the pages themselves and
// written with the same POSTs their own scripts send.

const LIST_PATH = '/custom/zra/rebate_list.php'
const CREATE_PATH = '/custom/zra/rebate_create.php'

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

interface RawSyncResponse {
  ok?: boolean
  error?: string
  synced?: number
  total?: number
  results?: { id?: string | number; ok?: boolean; code?: string; message?: string }[]
}

async function listPageToken(): Promise<string> {
  const doc = await fetchLegacyDocument(LIST_PATH)
  const token = doc.querySelector<HTMLMetaElement>('meta[name="anti-csrf-currenttoken"]')?.content ?? doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
  if (!token) throw new Error('Could not read the backend session token — sign out and back in, then retry.')
  return token
}

export function useSyncRebates() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false, // a sync is a real submission to the ZRA gateway
    mutationFn: async (ids: string[]): Promise<RebateSyncResult> => {
      const token = await listPageToken()
      const body = new URLSearchParams({ action: 'sync', token })
      ids.forEach((id, i) => body.set(`ids[${i}]`, id))
      const res = await fetch('/custom/zra/rebate_ajax.php', {
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
        throw new Error(res.ok ? 'The backend did not answer the sync request.' : `Legacy backend returned ${res.status}.`)
      }
      if (!data.ok) throw new Error(data.error || 'Sync failed')
      const results = (data.results ?? []).map((r) => ({ id: String(r.id ?? ''), ok: !!r.ok, code: r.code ?? '', message: r.message ?? '' }))
      return { synced: data.synced ?? results.filter((r) => r.ok).length, total: data.total ?? results.length, results }
    },
    // The list shows each rebate's ZRA status and message, which the sync changes.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'legacyList'] }),
  })
}

// ── Create Rebate Invoice ──────────────────────────────────────────────────
// rebate_create.php prints the customer picker; choosing a customer reloads the
// page with ?socid=… which adds the "Select Invoices for Rebate" table.
export interface RebateInvoiceRow {
  id: string
  ref: string
  date: string
  amountHt: string
  vat: string
  amountTtc: string
  zraStatus: string
}
export interface RebateCreateForm {
  token: string
  customers: { value: string; label: string }[]
  socid: string
  invoices: RebateInvoiceRow[]
}

export function useRebateCreateForm(socid: string) {
  return useQuery({
    queryKey: ['zra', 'rebateCreate', socid],
    queryFn: async (): Promise<RebateCreateForm> => {
      const doc = await fetchLegacyDocument(CREATE_PATH, socid ? new URLSearchParams({ socid }) : undefined)
      const select = doc.querySelector<HTMLSelectElement>('select[name="socid"]')
      if (!select) throw legacyMissingContentError(doc, 'The rebate form on this backend page was not recognised.')
      const customers = Array.from(select.options)
        .filter((o) => Number(o.value) > 0)
        .map((o) => ({ value: o.value, label: cellText(o) }))

      const invoices: RebateInvoiceRow[] = []
      const firstBox = doc.querySelector('input[name="selected_invoices[]"]')
      const table = firstBox?.closest('table')
      if (table) {
        const header = Array.from(table.querySelectorAll('tr')).find((r) => !r.querySelector('input[name="selected_invoices[]"]'))
        const heads = Array.from(header?.children ?? []).map((c) => cellText(c))
        const at = (re: RegExp) => heads.findIndex((h) => re.test(h))
        const col = { ref: at(/^Invoice Ref/i), date: at(/^Date/i), ht: at(/Amount HT/i), vat: at(/^VAT/i), ttc: at(/Amount TTC/i), zra: at(/ZRA Status/i) }
        for (const box of Array.from(table.querySelectorAll<HTMLInputElement>('input[name="selected_invoices[]"]'))) {
          const cells = Array.from(box.closest('tr')?.children ?? [])
          const text = (i: number) => (i >= 0 ? cellText(cells[i]) : '')
          invoices.push({ id: box.value, ref: text(col.ref), date: text(col.date), amountHt: text(col.ht), vat: text(col.vat), amountTtc: text(col.ttc), zraStatus: text(col.zra) })
        }
      }
      return {
        token: doc.querySelector<HTMLInputElement>('form input[name="token"]')?.value ?? doc.querySelector<HTMLMetaElement>('meta[name="anti-csrf-currenttoken"]')?.content ?? '',
        customers,
        socid: Number(select.value) > 0 ? select.value : '',
        invoices,
      }
    },
    staleTime: 0,
    gcTime: 0, // the CSRF token must not outlive the page
    placeholderData: keepPreviousData, // keep the form on screen while another customer loads
  })
}

export interface CreateRebateInput {
  token: string
  socid: string
  percentage: string
  reason: string
  invoiceIds: string[]
}

// The form's own POST: token, action=create_rebate, socid, rebate_percentage,
// rebate_reason and one selected_invoices[] per ticked invoice. The backend
// answers with a page that carries its message as showToast("…", type); an
// "error" one (e.g. "Please select at least one invoice") is the rejection.
export function useCreateRebate() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: CreateRebateInput): Promise<string> => {
      const body = new URLSearchParams({
        token: input.token,
        action: 'create_rebate',
        socid: input.socid,
        rebate_percentage: input.percentage,
        rebate_reason: input.reason,
      })
      for (const id of input.invoiceIds) body.append('selected_invoices[]', id)
      const res = await fetch(CREATE_PATH, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const messages = toastMessages(html)
      const err = messages.find((m) => m.type === 'error')
      if (err) throw new Error(err.message)
      return messages.map((m) => m.message).join('\n')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generalLedger', 'legacyList'] })
      queryClient.invalidateQueries({ queryKey: ['zra', 'rebateCreate'] })
    },
  })
}
