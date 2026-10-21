import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchLegacyDocument,
  legacyMissingContentError,
  looksLikeLegacyLoginPageText,
  NOT_SIGNED_IN_MESSAGE,
  parseLegacyJson,
} from '../../shared/legacyHtmlFetch'
import { fapi } from '../../api/axios'
import { MissingRouteError, preferNewApi, requireJson } from '../salesOrders/orderApi'
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

// custom/zra/fapi/rebate_list.php action=sync {ids} (max 50 per call): the same module code
// as the classic ajax (RebateInvoice::validate() / zra_submit_rebate_invoice()), but
// key-authenticated, so no CSRF token has to be scraped from the list page. Each row carries
// ZRA's own code ("000" = success); a non-zero code is ZRA's answer, not a failure of the call.
// The response shape is not published yet, so rows are read by their likely names.
const SYNC_BATCH = 50

type FapiSyncRow = { id?: string | number; rebate_id?: string | number; ok?: boolean; success?: boolean; code?: string | number; zra_code?: string | number; message?: string; zra_message?: string }

async function syncViaFapi(ids: string[]): Promise<RebateSyncResult> {
  const results: RebateSyncOutcome[] = []
  let synced = 0
  for (let i = 0; i < ids.length; i += SYNC_BATCH) {
    const chunk = ids.slice(i, i + SYNC_BATCH).map(Number)
    const res = requireJson(await fapi.post('/custom/zra/fapi/rebate_list.php', { action: 'sync', ids: chunk }, { params: { action: 'sync' }, validateStatus: () => true }))
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

async function syncViaClassic(ids: string[]): Promise<RebateSyncResult> {
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
}

export function useSyncRebates() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false, // a sync is a real submission to the ZRA gateway
    // The classic route is used only when the fapi route is absent (an HTML 404 before anything is sent).
    mutationFn: (ids: string[]): Promise<RebateSyncResult> => preferNewApi('rebateSync', () => syncViaFapi(ids), () => syncViaClassic(ids)),
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

// custom/zra/fapi/rebate_create.php?socid=X answers the eligible invoices (validated standard
// invoices ZRA accepted, with no rebate against them yet). Its field names are not published, so
// they are read by their likely names, and when the answer carries neither a customer list nor
// invoices the classic page is read instead. A form read this way has an empty `token`, which
// makes the create below use the JSON route too.
type FapiOption = { value?: string | number; id?: string | number; label?: string; name?: string }
type FapiEligible = Record<string, unknown>

async function rebateFormViaFapi(socid: string): Promise<RebateCreateForm> {
  const res = requireJson(await fapi.get('/custom/zra/fapi/rebate_create.php', { params: socid ? { socid } : {} }))
  const body = res.data as { success?: boolean; message?: string; data?: { customers?: FapiOption[]; invoices?: FapiEligible[]; items?: FapiEligible[]; socid?: string | number } }
  if (!body.success) throw new Error(body.message || 'Could not load the rebate form.')
  const d = body.data ?? {}
  const list = d.invoices ?? d.items
  if (!d.customers && !list) throw new MissingRouteError() // unknown shape: read the classic page instead
  const text = (v: unknown) => (v === undefined || v === null ? '' : String(v))
  return {
    token: '',
    customers: (d.customers ?? []).map((c) => ({ value: text(c.value ?? c.id), label: text(c.label ?? c.name) })),
    socid: text(d.socid ?? socid),
    invoices: (list ?? []).map((i) => ({
      id: text(i.id ?? i.invoice_id),
      ref: text(i.ref ?? i.invoice_ref),
      date: text(i.date),
      amountHt: text(i.amount_ht ?? i.total_ht),
      vat: text(i.vat ?? i.amount_tva ?? i.total_tva),
      amountTtc: text(i.amount_ttc ?? i.total_ttc),
      zraStatus: text(i.zra_status ?? i.zra_status_label),
    })),
  }
}

export function useRebateCreateForm(socid: string) {
  return useQuery({
    queryKey: ['zra', 'rebateCreate', socid],
    queryFn: (): Promise<RebateCreateForm> => preferNewApi('rebateCreateForm', () => rebateFormViaFapi(socid), () => rebateFormViaClassic(socid)),
    staleTime: 0,
    gcTime: 0, // a classic form's CSRF token must not outlive the page
    placeholderData: keepPreviousData, // keep the form on screen while another customer loads
  })
}

async function rebateFormViaClassic(socid: string): Promise<RebateCreateForm> {
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
      // A form read through the JSON route has no CSRF token: create through the JSON route too.
      // The rebate is left as a draft; the next step is the sync.
      if (!input.token) {
        const res = requireJson(
          await fapi.post(
            '/custom/zra/fapi/rebate_create.php',
            { socid: Number(input.socid), selected_invoices: input.invoiceIds.map(Number), rebate_percentage: Number(input.percentage), rebate_reason: input.reason },
            { validateStatus: () => true },
          ),
        )
        const reply = res.data as { success?: boolean; message?: string; errors?: unknown }
        if (!reply.success) {
          const detail = reply.errors && !Array.isArray(reply.errors) ? Object.values(reply.errors as Record<string, unknown>).flat().join(' ') : ''
          throw new Error(reply.message || detail || 'Could not create the rebate.')
        }
        return reply.message || 'Rebate created as a draft. Sync it to ZRA next.'
      }
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

// custom/zra/fapi/rebate_list.php answers 409 "Value Credit Notes are not enabled on this
// instance" when ZRA_REBATE_ENABLED is off (the same gate the classic pages apply). Asking
// it first means a disabled install says so at once, instead of after the classic page's
// empty answer has been retried three times. Any other answer (including a backend without
// the endpoint) leaves the classic page to try.
export function useRebatesEnabled() {
  return useQuery({
    queryKey: ['zra', 'rebates', 'enabled'],
    queryFn: async (): Promise<{ enabled: boolean; message: string }> => {
      try {
        const res = await fapi.get('/custom/zra/fapi/rebate_list.php', { params: { limit: 1 }, validateStatus: (status) => status === 409 || (status >= 200 && status < 300) })
        if (res.status === 409) {
          const message = (res.data as { message?: string } | undefined)?.message
          return { enabled: false, message: message || 'Value Credit Notes are not enabled on this instance.' }
        }
      } catch {
        // endpoint missing or unreachable: the classic page decides
      }
      return { enabled: true, message: '' }
    },
    staleTime: 1000 * 60 * 5,
  })
}
