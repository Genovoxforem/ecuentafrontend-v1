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

// Relative path only — never an absolute backend URL here. In dev, Vite's
// proxy (see vite.config.ts, driven by the same backends.ts this file would
// otherwise duplicate) forwards "/api/*" to whichever backend is selected;
// in production, this build must be deployed behind a host/reverse-proxy
// that does the same. Either way every request stays same-origin with the
// page, which is what avoids CORS entirely — see backends.ts to switch
// which backend that proxy actually points at.
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
