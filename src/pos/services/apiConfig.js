import { BACKEND_URLS, getActiveBackend } from "../../api/backends";

// Backend selection is now a single source of truth: the main app's
// .env.local (VITE_ACTIVE_BACKEND, read via src/api/backends.ts) — change
// it there, restart the dev server, and every request (POS's included)
// follows. No more runtime override, login-screen backend field, or
// per-tab ?backend= handoff.
export const getApiBaseUrl = () => BACKEND_URLS[getActiveBackend()];

// Every POS request is a same-origin relative path now — Vite's dev proxy
// (vite.config.ts) forwards /api, /custom, /takeposnew and /takepos to
// whatever getApiBaseUrl() above resolves to; production deployment must do
// the same at the hosting/reverse-proxy level.
export const buildRequestUrl = (path) => path;

// No-op now (nothing needs a dynamic backend header anymore) — kept so
// every existing `...dynamicProxyHeaders()` call site still works unchanged.
export const dynamicProxyHeaders = () => ({});

// The legacy same-origin endpoints (tables.php, reports_data.php,
// payment_summary.php, takeposnew/index.php's session-cookie login) rely on
// a real Dolibarr session cookie, which only gets sent when the browser
// considers this app and the backend the same origin. That's always true
// now: every request is a same-origin relative path proxied server-side
// (see buildRequestUrl above), exactly like the main app's own /api calls.
export const isSameOriginBackend = () => true;
