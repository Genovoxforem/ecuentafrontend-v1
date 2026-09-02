import { getBackendUrl } from "../../api/backends";

// Backend selection is now a single source of truth: VITE_BACKEND_URL in
// the active .env file. Restart the dev server after changing it.
export const getApiBaseUrl = () => getBackendUrl();

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
