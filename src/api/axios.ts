import axios from 'axios'
import { getBackendUrl, isCrossOriginDeployment } from './backends'

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

// In same-origin deployments or local dev (with Vite proxy), relative paths are used.
// In cross-origin deployments (e.g. frontend hosted on separate domain like cPanel),
// requests point directly to the configured VITE_BACKEND_URL with CORS credentials.
const crossOrigin = isCrossOriginDeployment()
const backendBase = crossOrigin ? getBackendUrl() : ''

export const api = axios.create({
  baseURL: crossOrigin ? `${backendBase}/api` : '/api',
  timeout: 15000,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    // Authorization is always allowed by backend CORS preflight for /api/*.
    config.headers['Authorization'] = token
    // X-API-Key is blocked by backend CORS Access-Control-Allow-Headers on cross-origin
    // production deployments — only send it on same-origin (local dev / Vite proxy).
    if (!crossOrigin) {
      config.headers['X-API-Key'] = token
    }
  }
  return config
})

// fapi axios instance — for module-level fapi endpoints (e.g. /societe/fapi/*,
// /contact/fapi/*, /compta/facture/fapi/*).
export const fapi = axios.create({
  baseURL: backendBase,
  timeout: 15000,
  withCredentials: true,
})

fapi.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers['X-API-Key'] = token
  }
  return config
})

// Configure default axios for direct calls across the app
axios.interceptors.request.use((config) => {
  const isCrossOrigin = isCrossOriginDeployment()
  if (isCrossOrigin && config.url && config.url.startsWith('/') && !/^https?:\/\//i.test(config.url)) {
    const isCoreApi = config.url.startsWith('/api/') || config.url === '/api'
    config.url = `${getBackendUrl()}${config.url}`
    config.withCredentials = !isCoreApi
  }
  const token = getStoredToken()
  if (token) {
    if (!config.headers['Authorization']) config.headers['Authorization'] = token
    // X-API-Key blocked by backend CORS preflight on cross-origin — only send same-origin
    if (!isCrossOrigin && !config.headers['X-API-Key']) config.headers['X-API-Key'] = token
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
