import axios from 'axios'

const TOKEN_STORAGE_KEY = 'ecuenta_token'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

// Relative path only — never an absolute backend URL here, in dev or prod.
//
// Dev: Vite's dev-server proxy (vite.config.ts, driven by the same
// backends.ts this would otherwise duplicate) forwards "/api/*" same-origin
// to the backend selected by VITE_BACKEND_URL.
//
// Prod: this build is deployed onto the backend's own origin (e.g. the
// dist/ output served from https://demo1.ecuenta.online alongside its
// existing PHP/api/* routes — see deploy/vhost-frontend.conf.example for
// the reverse-proxy variant if the frontend instead lives on its own
// domain), so "/api" already resolves to the real backend with zero
// cross-origin request involved. Either way every request stays
// same-origin with the page, which is what avoids CORS entirely: the
// backend's incomplete CORS headers block the authenticated follow-up
// calls when requests are cross-origin.
export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers['X-API-Key'] = token
  }
  return config
})

// fapi axios instance — for module-level fapi endpoints (e.g. /societe/fapi/*,
// /contact/fapi/*, /compta/facture/fapi/*). These are bearer-token-authenticated
// JSON API adapters that wrap the existing Dolibarr business classes. Uses an
// empty baseURL so the full path (e.g. /societe/fapi/list.php) is resolved
// same-origin via the Vite dev proxy (which already proxies /societe/*) or
// directly in production (same-origin deployment).
export const fapi = axios.create({
  baseURL: '',
  timeout: 15000,
})

fapi.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers['X-API-Key'] = token
  }
  return config
})

let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

// POS's own fetch-based requests (src/pos/services/axios.js and friends)
// don't go through this axios instance, so they can't hit the 401
// interceptor below — this lets them trigger the exact same
// logout-and-redirect-to-login flow on their own 401s.
export function notifyUnauthorized() {
  setStoredToken(null)
  onUnauthorized?.()
}

function handleApiError(error: unknown) {
  // A request aborted through its AbortSignal (the page was left, the search changed) is not a failure: no logout, no rewritten message.
  if (axios.isCancel(error)) return Promise.reject(error)
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    setStoredToken(null)
    onUnauthorized?.()
  } else if (axios.isAxiosError(error) && !error.response) {
      // The browser never got a response at all — this is either a real
      // network failure, or the request was cross-origin and got
      // CORS-blocked before reaching this code. Every protected endpoint
      // except api/login/ (which has its own early `if REQUEST_METHOD===OPTIONS
      // exit`) hits main.inc.php's CSRF check first on an OPTIONS preflight,
      // which returns a plain-text refusal page with zero Access-Control-*
      // headers — so a cross-origin caller's preflight fails and the actual
      // request never fires. That's a backend response-ordering bug, not
      // fixable here: browser CORS enforcement happens before any JS runs.
      // The mitigation is architectural — every request in this app stays
      // same-origin (Vite's dev proxy, or same-origin production deployment —
      // see this file's top comment). This branch only fires if that policy
      // is ever broken (e.g. a hardcoded absolute backend URL), and exists so
      // that shows up as a clear message instead of a bare "Network Error".
      error.message =
        'Unable to reach the server — this may be a network issue, or a request went directly to a remote backend instead of through the app\'s same-origin proxy (check VITE_BACKEND_URL and that requests use relative /api paths).'
  }
  return Promise.reject(error)
}

api.interceptors.response.use((response) => response, handleApiError)
// Every non-GET fapi answer lists the body keys the endpoint never read (ignored_fields[]), which is
// how a silently dropped field shows up. Log it in dev so a form sending an unsupported key is caught.
fapi.interceptors.response.use((response) => {
  const ignored = (response.data as { ignored_fields?: unknown } | null)?.ignored_fields
  if (import.meta.env.DEV && response.config.method !== 'get' && Array.isArray(ignored) && ignored.length) {
    console.warn(`[fapi] ${response.config.url} ignored: ${ignored.join(', ')}`)
  }
  return response
}, handleApiError)
