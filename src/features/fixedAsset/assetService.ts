import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// Client for the Fixed Asset v2 backend (asset/api/assets.php, depreciation.php, reports.php, setup.php) and the ledger account list its
// forms use (accountancy/workspace/api/accounts.php). Read on newecuenta, 11 Nov 2026, from the page scripts of the new asset pages
// (asset/js/list.js, new.js, run.js, reports.js, setup.js, view.js, accountancy/workspace/assets/acws-core.js):
//   - every answer is {success, data, message, errors}; a refused request is {success:false, message, errors:{field:[text]}} with a 4xx status
//     (422 for a field error, 409 when the disposal needs the depreciation caught up first, carried in errors.due);
//   - these endpoints answer the classic PHP SESSION COOKIE only: a request with just the app's X-API-Key gets the login page back (checked),
//     so this client sends the cookie (same origin) like the Pharmacy and Members pages do, not the key-based axios instance;
//   - a read is a GET with ?action=...; a write is a JSON POST whose body carries `token` (and the X-CSRF-Token header). The token is the
//     one the asset pages print in window.ACWS; it stayed the same across page loads of one session (checked), so it is read once from
//     the asset list page and kept; a 403 refreshes it once and sends the request again.
const BASE = '/asset/api/'
const ACCOUNTS_URL = '/accountancy/workspace/api/accounts.php'
const TOKEN_PAGE = '/asset/assets.php'

export type Params = Record<string, string | number | null | undefined>

export class AssetApiError extends Error {
  status: number
  // Same name the other clients give an HTTP status so the query client does not retry a refused (4xx) request.
  httpStatus: number
  errors: Record<string, unknown>
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message)
    this.name = 'AssetApiError'
    this.status = status
    this.httpStatus = status
    this.errors = errors
  }
}

interface Envelope<T> {
  success?: boolean
  data?: T
  message?: string | null
  errors?: unknown
}

export interface AssetReply<T> {
  data: T
  message: string | null
}

function query(params?: Params): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

// A dev backend prints PHP notices ahead of the JSON; the answer still parses from its first `{"`.
function parseBody<T>(text: string): Envelope<T> | null {
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

function fieldErrors(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

// The text of one field error: a string, or a list of strings.
export function errorText(value: unknown): string {
  const list = Array.isArray(value) ? value : [value]
  return list.filter((v): v is string => typeof v === 'string').join(' ')
}

// The classic session is gone (expired, or the browser lost the cookie): the token read in it is no use in the next one, so it is forgotten and
// read again once the user has signed in again (Reconnect).
function sessionLost(): AssetApiError {
  tokenRead = null
  return new AssetApiError(NOT_SIGNED_IN_MESSAGE, 401)
}

async function readReply<T>(res: Response): Promise<AssetReply<T>> {
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw sessionLost()
  const body = parseBody<T>(text)
  if (!body) throw new AssetApiError(res.ok ? 'The server did not answer with data. Reload the page to try again.' : `Backend returned ${res.status}.`, res.status)
  if (!res.ok || body.success === false) {
    const errors = fieldErrors(body.errors)
    throw new AssetApiError(body.message || `Backend returned ${res.status}.`, res.status, errors)
  }
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

export async function assetGetUrl<T>(url: string, params?: Params, signal?: AbortSignal): Promise<T> {
  const res = await fetchChecked(`${url}${query(params)}`, { headers: { Accept: 'application/json' }, signal })
  return (await readReply<T>(res)).data
}

export const assetGet = <T>(file: string, params?: Params, signal?: AbortSignal) => assetGetUrl<T>(`${BASE}${file}`, params, signal)

// ---- writes ---------------------------------------------------------------------------------------------------------
let tokenRead: Promise<string> | null = null

async function fetchToken(): Promise<string> {
  const res = await fetchChecked(TOKEN_PAGE, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw sessionLost()
  // window.ACWS = {"root":"","api":"/asset/api/","accounts":"...","token":"<hex>","currency":...}; the page's own meta tag carries the same value.
  const m = /window\.ACWS\s*=\s*\{[^}]*?"token"\s*:\s*"([^"]+)"/.exec(html) ?? /name="anti-csrf-newtoken"\s+content="([^"]+)"/.exec(html)
  if (!m) throw new AssetApiError('The asset page did not give a security token. Sign in again to open its session.', 0)
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
export function resetAssetToken() {
  tokenRead = null
}

async function send<T>(url: string, body: Record<string, unknown>, retried: boolean): Promise<AssetReply<T>> {
  const token = await readToken(retried)
  const res = await fetchChecked(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({ ...body, token }),
  })
  if (res.status === 403 && !retried) return send<T>(url, body, true)
  return readReply<T>(res)
}

export const assetPost = <T>(file: string, body: Record<string, unknown>, params?: Params) => send<T>(`${BASE}${file}${query(params)}`, body, false)

// ---- ledger accounts --------------------------------------------------------------------------------------------------
export interface LedgerAccount {
  number: string
  label: string
}

export async function fetchLedgerAccounts(): Promise<LedgerAccount[]> {
  const d = await assetGetUrl<{ accounts?: Array<{ number?: string | number; label?: string }> }>(ACCOUNTS_URL, { all: 1 })
  return (d.accounts ?? []).map((a) => ({ number: String(a.number ?? ''), label: String(a.label ?? '') })).filter((a) => a.number)
}
