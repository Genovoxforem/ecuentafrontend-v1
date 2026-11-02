// The Pharmacy suite's own backend (custom/pharmacy/app.php talks to these three PHP endpoints). Observed on
// newecuenta (GET only): they answer the legacy PHP SESSION COOKIE; an X-API-Key request gets the login page
// back instead of JSON. So this client sends the cookie (credentials: 'include') through the same-origin proxy,
// the way POS does (see src/features/auth/legacySession.ts) — not the app's key-based axios instance.
const API = '/custom/pharmacy/fapi/api.php'
const POS_API = '/takeposnew/pharmacy/fapi/pos.php'
const RACKS_API = '/custom/racks/fapi/assignments.php'

export class PharmacyApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'PharmacyApiError'
    this.status = status
    this.code = code
  }
}

type Params = Record<string, string | number | undefined>

function query(params: Params): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'include' })
  } catch {
    throw new PharmacyApiError(0, 'offline', 'Could not reach the pharmacy service.')
  }
  const text = await res.text()
  let body: Record<string, unknown>
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    // The login page comes back when there is no legacy session cookie.
    throw new PharmacyApiError(res.status, 'not_json', 'The pharmacy service did not answer with data. Sign in again to open its session.')
  }
  if (!res.ok || body.success === false) {
    const msg = String(body.error ?? body.message ?? `Request failed (${res.status})`)
    throw new PharmacyApiError(res.status, String(body.error ?? `http_${res.status}`), msg)
  }
  return body as T
}

export const pharmacyGet = <T>(module: string, action: string, params: Params = {}) => getJson<T>(`${API}${query({ m: module, action, ...params })}`)
export const pharmacyPosGet = <T>(action: string, params: Params = {}) => getJson<T>(`${POS_API}${query({ action, ...params })}`)
export const pharmacyRacksGet = async <T>(params: Params = {}) => {
  const body = await getJson<{ data?: T }>(`${RACKS_API}${query(params)}`)
  return (body.data ?? body) as T
}

// ---- Writes (POST) -------------------------------------------------------------------------------------------------
// The classic app posts form-encoded fields plus the page's CSRF token (the "pharmacy-csrf" meta tag of app.php) and an
// X-Idempotency-Key header. The token is read from that page once and reused; a 403 refreshes it once and retries.
const APP_PAGE = '/custom/pharmacy/app.php?mainmenu=pharmacy&leftmenu=pharmacy_dispense'
let csrfToken: string | null = null

async function readCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken
  let html: string
  try {
    html = await (await fetch(APP_PAGE, { credentials: 'include' })).text()
  } catch {
    throw new PharmacyApiError(0, 'offline', 'Could not reach the pharmacy service.')
  }
  const m = /<meta\s+name="pharmacy-csrf"\s+content="([^"]*)"/i.exec(html)
  if (!m) throw new PharmacyApiError(0, 'no_token', 'The pharmacy page did not give a security token. Sign in again to open its session.')
  csrfToken = m[1]
  return csrfToken
}

async function postForm<T>(url: string, fields: Params, idempotencyKey?: string, retried = false): Promise<T> {
  const token = await readCsrfToken(retried)
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) body.set(k, String(v))
  body.set('token', token)
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers, body })
  } catch {
    throw new PharmacyApiError(0, 'offline', 'Could not reach the pharmacy service.')
  }
  if (res.status === 403 && !retried) return postForm<T>(url, fields, idempotencyKey, true)
  const text = await res.text()
  let out: Record<string, unknown>
  try {
    out = text ? JSON.parse(text) : {}
  } catch {
    throw new PharmacyApiError(res.status, 'not_json', 'The server did not return JSON.')
  }
  if (!res.ok || out.success === false) {
    const msg = String(out.error ?? out.message ?? `Request failed (${res.status})`)
    throw new PharmacyApiError(res.status, String(out.error ?? `http_${res.status}`), msg)
  }
  return out as T
}

export const pharmacyPost = <T>(module: string, action: string, fields: Params = {}, idempotencyKey?: string) =>
  postForm<T>(`${API}${query({ m: module, action })}`, fields, idempotencyKey)
export const pharmacyPosPost = <T>(action: string, fields: Params = {}, idempotencyKey?: string) => postForm<T>(`${POS_API}${query({ action })}`, fields, idempotencyKey)

export const idemKey = (prefix: string, id?: number | string) => `${prefix}${id !== undefined ? `-${id}` : ''}-${Date.now()}`
