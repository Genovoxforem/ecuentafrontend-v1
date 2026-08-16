// Backend root origins for manual testing across environments. Both
// vite.config.ts (dev proxy target) and getActiveBackend() below derive
// ACTIVE_BACKEND from the same VITE_ACTIVE_BACKEND env var — see .env.example.
// Copy it to .env.local (gitignored, per-developer/per-machine) and change
// it there instead of editing this file.
export const BACKEND_URLS = {
  local: 'http://localhost/ecnta10/htdocs',
  demoV2: 'https://demov2.ecuenta.app',
  demo1: 'https://demo1.ecuenta.online',
  live: 'http://192.168.1.10',
  demo2: 'https://demo2.ecuenta.online',
} as const

export type BackendName = keyof typeof BACKEND_URLS

// Falls back here if VITE_ACTIVE_BACKEND is unset or names something not in
// BACKEND_URLS above.
export const DEFAULT_BACKEND: BackendName = 'demoV2'

export function resolveActiveBackend(raw: string | undefined): BackendName {
  return raw !== undefined && raw in BACKEND_URLS ? (raw as BackendName) : DEFAULT_BACKEND
}

// Client-side resolution only — reads VITE_ACTIVE_BACKEND from .env.local.
// This is a function, not a top-level const: this file is also imported by
// vite.config.ts (running in Node, to compute the dev proxy target), where
// import.meta.env is never populated — that injection only applies to code
// Vite actually bundles for the browser. A top-level `import.meta.env.X`
// read here would throw the moment vite.config.ts imported this module.
// vite.config.ts resolves its own copy via Vite's loadEnv() instead, so
// this is only ever called from browser-executed code. Keep .env.local in
// sync if you change backends, or the dev proxy and the app's own requests
// end up pointed at different places.
export function getActiveBackend(): BackendName {
  return resolveActiveBackend(import.meta.env?.VITE_ACTIVE_BACKEND)
}

// Some API responses (e.g. GET /user/'s `photo`) return a root-relative path
// straight from PHP (DOL_URL_ROOT + '/viewimage.php?...'), not a full URL.
// Vite's dev proxy only forwards /api and /custom, so those paths need the
// backend's own origin stitched back on to resolve outside of axios's /api
// baseURL — e.g. for <img src>.
export function resolveBackendAsset(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const origin = new URL(BACKEND_URLS[getActiveBackend()]).origin
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}
