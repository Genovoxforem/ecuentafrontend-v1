// Best-effort bootstrap of a real Dolibarr PHP session (the DOLSESSID
// cookie), fired alongside the app's own token login. Purely for POS's
// legacy same-origin endpoints (reports_data.php, payment_summary.php,
// tables.php — see src/pos/features/reports/services/reportsApi.js), which
// are cookie-authenticated and return real Author/Payment Type/Change data
// that api/invoices/index.php (the fallback those endpoints use when this
// cookie is missing) doesn't carry at all.
//
// Before commit 9fbbb68 ("Merge POS into the main app..."), POS ran its own
// login screen that established this cookie. That screen was intentionally
// removed in favor of the shared token-based AuthContext login — this
// restores just the cookie side effect, without bringing back a second
// login UI: it reuses the same credentials the user already typed into the
// one shared /login form.
//
// Only runs at the moment of an actual login submission, not on later page
// loads/reloads that resume a session from the stored bearer token — the
// plaintext password is never persisted (by design), so there's no password
// available to redo this once the login form itself is gone. A session that
// outlives the tab (reload, revisit) simply won't have the legacy cookie
// until the user logs in again.
//
// ASSUMES stock Dolibarr's login form contract: POST to the same URL the
// login page is served from, fields `username`/`password`/`actionlogin=login`
// plus a CSRF `token` scraped from that page's own hidden input. This has
// NOT been verified against the live demo1 backend — if its login page is
// customized, the field names/token regex below may need adjusting. Wired
// through the '^/index.php$' rule in vite.config.ts so the request stays
// same-origin (required for the Set-Cookie to actually stick).
//
// Never throws — the legacy session is optional. Every consumer already
// falls back gracefully when it's missing (see getReportsInRange).
const LOGIN_PATH = '/index.php'
const TOKEN_FIELD_RE = /name=["']token["']\s+value=["']([^"']*)["']/i

export async function establishLegacySession(login: string, password: string): Promise<void> {
  try {
    const pageResponse = await fetch(LOGIN_PATH, { credentials: 'same-origin' })
    const html = await pageResponse.text()
    const token = TOKEN_FIELD_RE.exec(html)?.[1]

    const body = new URLSearchParams()
    body.set('username', login)
    body.set('password', password)
    body.set('actionlogin', 'login')
    if (token) body.set('token', token)

    await fetch(LOGIN_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch {
    // Optional — POS's legacy report endpoints already fall back to
    // api/invoices/index.php when this cookie never shows up.
  }
}
