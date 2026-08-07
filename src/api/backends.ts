// Backend root origins for manual testing across environments. Both
// vite.config.ts (dev proxy target) and axios.ts derive from this one file
// — change ACTIVE_BACKEND here, then restart `npm run dev` (Vite's proxy
// config isn't hot-reloadable, unlike everything else in this app) to
// switch which backend you're testing against.
export const BACKEND_URLS = {
  local: 'http://localhost/ecnta10/htdocs',
  demoV2: 'https://demov2.ecuenta.app',
  demo1: 'https://demo1.ecuenta.online',
} as const

// <-- CHANGE THIS, then restart the dev server.
export const ACTIVE_BACKEND: keyof typeof BACKEND_URLS = 'local'
    
// Some API responses (e.g. GET /user/'s `photo`) return a root-relative path
// straight from PHP (DOL_URL_ROOT + '/viewimage.php?...'), not a full URL.
// Vite's dev proxy only forwards /api and /custom, so those paths need the
// backend's own origin stitched back on to resolve outside of axios's /api
// baseURL — e.g. for <img src>.
export function resolveBackendAsset(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const origin = new URL(BACKEND_URLS[ACTIVE_BACKEND]).origin
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}
