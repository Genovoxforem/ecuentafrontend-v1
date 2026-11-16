import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { AssetApiError } from '../fixedAsset/assetService'

// Client for the Installment Sales backend on newecuenta (installment/api/plans.php, payments.php, receipts.php, reports.php, settings.php),
// read 12 Nov 2026 from the pages' own scripts (installment/js/*.js). Same contract as the Fixed Asset v2 endpoints:
//   - every answer is {success, data, message, errors}; a refusal is {success:false, message, errors:{field:[text]}} with a 4xx status;
//   - the endpoints answer the classic PHP SESSION COOKIE only (the app's X-API-Key gets the login page), so requests are same-origin with the cookie;
//   - a write is a JSON POST whose body carries `token` (+ X-CSRF-Token header); the token is window.ACWS.token printed in any installment page.
// A refusal is thrown as the Fixed Asset error class (AssetApiError) so the shared form dialog shows its field errors.
const BASE = '/installment/api/'
const TOKEN_PAGE = '/installment/dashboard.php'
// The invoice endpoints the "New invoice" mode of Create uses (form-encoded POST with the same token).
export const WIZARD_API = '/compta/facture/api/wizard_api.php'
export const LINES_API = '/compta/facture/api/invoice_lines_api.php'

export type Params = Record<string, string | number | boolean | null | undefined>

interface Envelope<T> {
  success?: boolean
  data?: T
  message?: string | null
  errors?: unknown
  error?: string
}

export interface InstallmentReply<T> {
  data: T
  message: string | null
}

function query(params?: Params): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function parseEnvelope<T>(text: string): Envelope<T> | null {
  try {
    return JSON.parse(text) as Envelope<T>
  } catch {
    const start = text.indexOf('{"')
    if (start < 0) return null
    try {
      return JSON.parse(text.slice(start)) as Envelope<T>
    } catch {
      return null
    }
  }
}

let tokenRead: Promise<string> | null = null

function sessionLost(): AssetApiError {
  tokenRead = null
  return new AssetApiError(NOT_SIGNED_IN_MESSAGE, 401)
}

function errorMap(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

async function readReply<T>(res: Response): Promise<InstallmentReply<T>> {
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw sessionLost()
  const body = parseEnvelope<T>(text)
  if (!body) throw new AssetApiError(res.ok ? 'The server did not answer with data. Reload the page to try again.' : `Backend returned ${res.status}.`, res.status)
  if (!res.ok || body.success === false) throw new AssetApiError(body.message || `Backend returned ${res.status}.`, res.status, errorMap(body.errors))
  return { data: body.data as T, message: body.message ?? null }
}

async function fetchChecked(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { credentials: 'same-origin', ...init })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new AssetApiError('Could not reach the server. Check the connection and try again.', 0)
  }
}

export async function installmentGet<T>(file: string, params?: Params, signal?: AbortSignal): Promise<T> {
  const res = await fetchChecked(`${BASE}${file}${query(params)}`, { headers: { Accept: 'application/json' }, signal })
  return (await readReply<T>(res)).data
}

async function fetchToken(): Promise<string> {
  const res = await fetchChecked(TOKEN_PAGE, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw sessionLost()
  const m = /window\.ACWS\s*=\s*\{[^}]*?"token"\s*:\s*"([^"]+)"/.exec(html) ?? /name="anti-csrf-newtoken"\s+content="([^"]+)"/.exec(html)
  if (!m) throw new AssetApiError('The installment page did not give a security token. Sign in again to open its session.', 0)
  return m[1]
}

function readToken(force: boolean): Promise<string> {
  if (!force && tokenRead) return tokenRead
  const p = fetchToken()
  tokenRead = p
  p.catch(() => {
    if (tokenRead === p) tokenRead = null
  })
  return p
}

// For tests: forget the kept token.
export function resetInstallmentToken() {
  tokenRead = null
}

async function send<T>(url: string, body: Record<string, unknown>, retried: boolean): Promise<InstallmentReply<T>> {
  const token = await readToken(retried)
  const res = await fetchChecked(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({ ...body, token }),
  })
  if (res.status === 403 && !retried) return send<T>(url, body, true)
  return readReply<T>(res)
}

export const installmentPost = <T>(file: string, body: Record<string, unknown>) => send<T>(`${BASE}${file}`, body, false)

// Form-encoded POST to the existing invoice APIs (they never renew the token); an answer with success:false is a refusal.
export async function invoiceApiPost<T>(url: string, params: Record<string, string | number | null | undefined>): Promise<T> {
  const token = await readToken(false)
  const b = new URLSearchParams()
  b.set('token', token)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) b.set(k, String(v))
  const res = await fetchChecked(url, { method: 'POST', headers: { Accept: 'application/json' }, body: b })
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw sessionLost()
  const j = parseEnvelope<T>(text)
  if (!j) throw new AssetApiError(`Session expired or server error (${res.status}).`, res.status)
  if (j.success === false) throw new AssetApiError(j.message || j.error || 'Request failed', res.status, errorMap(j.errors))
  return j.data as T
}

async function fetchFile(file: string, params: Params): Promise<Blob> {
  const res = await fetchChecked(`${BASE}${file}${query(params)}`, { headers: { Accept: '*/*' } })
  const blob = await res.blob()
  if (!res.ok || blob.type.includes('html') || blob.type.includes('json')) {
    const text = await blob.text()
    if (looksLikeLegacyLoginPageText(text)) throw sessionLost()
    throw new AssetApiError(parseEnvelope<unknown>(text)?.message || `Backend returned ${res.status}.`, res.status)
  }
  return blob
}

// A file the backend builds (CSV / PDF), fetched with the cookie and saved - the page never navigates to a backend .php address.
export async function downloadInstallmentFile(file: string, params: Params, filename: string): Promise<void> {
  const blob = await fetchFile(file, params)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}

export async function openInstallmentPdf(file: string, params: Params): Promise<void> {
  const blob = await fetchFile(file, params)
  window.open(URL.createObjectURL(blob), '_blank', 'noopener')
}
