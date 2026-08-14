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
// to whichever backend VITE_ACTIVE_BACKEND selects.
//
// Prod: this build is deployed onto the backend's own origin (e.g. the
// dist/ output served from https://demo1.ecuenta.online alongside its
// existing PHP/api/* routes — see deploy/vhost-frontend.conf.example for
// the reverse-proxy variant if the frontend instead lives on its own
// domain), so "/api" already resolves to the real backend with zero
// cross-origin request involved. Either way every request stays
// same-origin with the page, which is what avoids CORS entirely — this was
// deliberately reverted from a direct-call version (see git history) once
// that version confirmed live what the CORS-CSRF-Fix-Report.pdf diagnosis
// predicted: the backend's incomplete CORS headers block the
// authenticated follow-up calls when requests are genuinely cross-origin.
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setStoredToken(null)
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)
