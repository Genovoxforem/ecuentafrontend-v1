import axios from 'axios'

// Payroll V2 (custom/payroll_v2) ships its own JSON API — payroll_v2/api/<file>.php
// with an `action` parameter, answering {status:'ok', data:…} or {status:'error',
// message:…}. Reads are GET with a query string, writes are POST with a form body;
// both authenticate with the same session cookie as the rest of the app, so this
// stays same-origin exactly like `api` (see api/axios.ts for why).
const client = axios.create({
  baseURL: '/payroll_v2/api',
  timeout: 20000,
})

interface Envelope<T> {
  status: 'ok' | 'error'
  data?: T
  message?: string
}

// The PHP prints a couple of blank lines before its JSON, which axios then hands
// over as a string instead of a parsed object.
function unwrap<T>(body: Envelope<T> | string): T {
  const payload: Envelope<T> = typeof body === 'string' ? JSON.parse(body.trim()) : body
  if (payload.status !== 'ok') throw new Error(payload.message || 'Payroll request failed')
  return payload.data as T
}

export type Params = Record<string, string | number | boolean | undefined | null>
type Scalar = string | number | boolean
export type PostParams = Record<string, Scalar | undefined | null | Array<string | number> | Array<Record<string, Scalar | null | undefined>>>

const clean = (params: Params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))

export async function pv2Get<T>(endpoint: string, action: string, params: Params = {}): Promise<T> {
  const { data } = await client.get<Envelope<T> | string>(endpoint, { params: { action, ...clean(params) } })
  return unwrap<T>(data)
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
  const body = new URLSearchParams({ action })
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
  const { data } = await client.post<Envelope<T> | string>(endpoint, body)
  const payload: Envelope<T> = typeof data === 'string' ? JSON.parse(data.trim()) : data
  return { data: unwrap<T>(payload), message: payload.message ?? '' }
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
  const { data } = await client.get<Blob>('payslip.php', {
    params: clean({ action: 'get_pdf', payrun_id: payrunId, employee_id: employeeId }),
    responseType: 'blob',
  })
  if (data.type !== 'application/pdf') {
    const text = await data.text()
    let message = 'Could not open the payslip.'
    try {
      message = (JSON.parse(text.trim()) as Envelope<unknown>).message || message
    } catch {}
    throw new Error(message)
  }
  const url = URL.createObjectURL(data)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
