import axios from 'axios'
import { fapi } from '../../api/axios'

// Payroll V2 is served by payroll_v2/fapi/<file>.php?action=…: the same actions, params and data as the
// session-only payroll_v2/api/*, wrapped in the fapi envelope {success, data, message, errors} and
// authenticated with the app's API key (X-API-Key, see api/axios.ts). A failure comes back as a 4xx/5xx with
// the reason in `message`.
// Writes use a form-encoded body (with PHP's name[] / name[0][field] arrays): the fapi reads both JSON and form
// bodies, but shift.php?action=swap_shift refuses a JSON employee_id while the form one works, so the form body
// is the safe one.
const PREFIX = '/payroll_v2/fapi/'
const TIMEOUT = 20000

interface Envelope<T> {
  success: boolean
  data: T
  message: string | null
  errors?: unknown
}

export type Params = Record<string, string | number | boolean | undefined | null>
type Scalar = string | number | boolean
export type PostParams = Record<string, Scalar | undefined | null | Array<string | number> | Array<Record<string, Scalar | null | undefined>>>

const clean = (params: Params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))

function reason(body: unknown): string {
  const b = body as Partial<Envelope<unknown>> | null
  if (b && typeof b === 'object') {
    if (typeof b.message === 'string' && b.message) return b.message
    if (Array.isArray(b.errors) && typeof b.errors[0] === 'string') return b.errors[0]
  }
  return ''
}

// An answer that is not the envelope at all (the dev server's HTML page for an unproxied path) means the route is missing.
function unwrap<T>(body: Envelope<T> | string): Envelope<T> {
  if (typeof body !== 'object' || body === null) throw new Error('Payroll API route is not available on this backend.')
  if (body.success === false) throw new Error(reason(body) || 'Payroll request failed')
  return body
}

function failure(e: unknown): never {
  if (axios.isCancel(e)) throw e
  if (axios.isAxiosError(e) && e.response) throw new Error(reason(e.response.data) || `Payroll request failed (${e.response.status}).`)
  throw e
}

// A backend without the payroll_v2/fapi files (they answer a bare 404 there, checked 29 Oct 2026 on newecuenta and
// the classic server) is served by the session-only payroll_v2/api/* instead: the same actions and params, answering
// {status:'ok', data, message} / {status:'error', message}. The first 404 is remembered so later calls go straight there.
const SESSION_PREFIX = '/payroll_v2/api/'
let fapiMissing = false
const isNotFound = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 404

interface SessionEnvelope<T> {
  status: 'ok' | 'error'
  data?: T
  message?: string
}

// The session PHP prints a couple of blank lines before its JSON, so axios may hand it over as a string.
function unwrapSession<T>(body: SessionEnvelope<T> | string): { data: T; message: string } {
  let payload: SessionEnvelope<T> | null = null
  try {
    payload = typeof body === 'string' ? (JSON.parse(body.trim()) as SessionEnvelope<T>) : body
  } catch {
    throw new Error('Payroll is not signed in on this backend — log out and back in, then retry.')
  }
  if (!payload || payload.status !== 'ok') throw new Error(payload?.message || 'Payroll request failed')
  return { data: payload.data as T, message: payload.message ?? '' }
}

export async function pv2Get<T>(endpoint: string, action: string, params: Params = {}): Promise<T> {
  if (!fapiMissing) {
    try {
      const res = await fapi.get<Envelope<T> | string>(PREFIX + endpoint, { params: { action, ...clean(params) }, timeout: TIMEOUT })
      return unwrap<T>(res.data).data
    } catch (e) {
      if (!isNotFound(e)) return failure(e)
      fapiMissing = true
    }
  }
  try {
    const res = await fapi.get<SessionEnvelope<T> | string>(SESSION_PREFIX + endpoint, { params: { action, ...clean(params) }, timeout: TIMEOUT })
    return unwrapSession<T>(res.data).data
  } catch (e) {
    return failure(e)
  }
}

// A list goes out as name[]=a&name[]=b, which PHP reads as an array. (A plain
// URLSearchParams would send "a,b", and GETPOST(…, 'array') turns that into an
// empty array — why the classic page's own bulk-assign buttons fail.)
export async function pv2Post<T>(endpoint: string, action: string, params: PostParams = {}): Promise<T> {
  return (await pv2PostResult<T>(endpoint, action, params)).data
}

// Same as pv2Post, also handing back the API's own message ("Sent 3 payslips,
// 1 failed") for screens that show it.
export async function pv2PostResult<T>(endpoint: string, action: string, params: PostParams = {}): Promise<{ data: T; message: string }> {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        // A list of records goes out as name[0][field]=…, which PHP reads as an array of arrays.
        if (item !== null && typeof item === 'object') {
          for (const [field, v] of Object.entries(item)) if (v !== undefined && v !== null) body.append(`${key}[${i}][${field}]`, String(v))
        } else body.append(`${key}[]`, String(item))
      })
    } else body.append(key, String(value))
  }
  if (!fapiMissing) {
    try {
      const res = await fapi.post<Envelope<T> | string>(PREFIX + endpoint, body, { params: { action }, timeout: TIMEOUT })
      const payload = unwrap<T>(res.data)
      return { data: payload.data, message: payload.message ?? '' }
    } catch (e) {
      if (!isNotFound(e)) return failure(e)
      fapiMissing = true
    }
  }
  try {
    body.set('action', action)
    const res = await fapi.post<SessionEnvelope<T> | string>(SESSION_PREFIX + endpoint, body, { timeout: TIMEOUT })
    return unwrapSession<T>(res.data)
  } catch (e) {
    return failure(e)
  }
}

// The API returns MySQL rows, so every column arrives as a string (or null).
export const num = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const periodLabel = (month: unknown, year: unknown) => `${MONTHS[num(month)] ?? ''} ${year ?? ''}`.trim()

// payslip.php?action=get_pdf streams the PDF, or answers the JSON envelope when it
// cannot. Fetched as a file and opened from memory, so no backend .php URL is
// ever linked to directly.
export async function openPayslipPdf(payrunId: string, employeeId?: string) {
  let data: Blob
  const fetchPdf = (prefix: string) => fapi.get<Blob>(prefix + 'payslip.php', { params: clean({ action: 'get_pdf', payrun_id: payrunId, employee_id: employeeId }), responseType: 'blob', timeout: 60000 })
  try {
    try {
      if (fapiMissing) throw new Error('fapi-missing')
      data = (await fetchPdf(PREFIX)).data
    } catch (e) {
      if (!(e instanceof Error && e.message === 'fapi-missing') && !isNotFound(e)) throw e
      fapiMissing = true
      data = (await fetchPdf(SESSION_PREFIX)).data
    }
  } catch (e) {
    // An error answers the JSON envelope; with a blob response type it arrives as a Blob.
    if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
      let message = 'Could not open the payslip.'
      try {
        message = reason(JSON.parse((await e.response.data.text()).trim())) || message
      } catch {}
      throw new Error(message)
    }
    return failure(e)
  }
  if (data.type !== 'application/pdf') {
    const text = await data.text()
    let message = 'Could not open the payslip.'
    try {
      message = reason(JSON.parse(text.trim())) || message
    } catch {}
    throw new Error(message)
  }
  const url = URL.createObjectURL(data)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
