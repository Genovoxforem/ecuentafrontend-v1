// Shared fetch helper for client-side "scrape a legacy Dolibarr page since no
// REST API exists" data sources (General Ledger/Journals, Warehouse stats —
// see each feature's own *HtmlParser.ts for the page-specific markup notes).
// Same-origin, relying on the DOLSESSID cookie establishLegacySession sets
// at login (see features/auth/legacySession.ts).

export const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. This data has no REST API and reads the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

// Same signal every feature's own looksLikeLegacyLoginPage(doc) checks
// (doc.querySelector('input[name="password"]')) — a text-based version for
// callers that don't go through fetchLegacyDocument's DOMParser (the JSON
// AJAX endpoints below, and any parser working on raw text instead of a
// Document).
export function looksLikeLegacyLoginPageText(html: string): boolean {
  return html.includes('name="password"') && html.includes('actionlogin')
}

// Bug found live (Expense Report detail page, 172.16.5.10): a real session
// expiry mid-testing made this silently return the login page's own HTML —
// every selector in the caller's parser simply matched nothing, so the page
// rendered with blank fields/tabs instead of a clear error, and nothing
// here or in the caller could tell the difference. fetchLegacyText already
// guards against this (looksLikeLegacyLoginPageText); this was the one gap
// — every parser going through fetchLegacyDocument instead had no such
// check.
export async function fetchLegacyDocument(path: string, params?: URLSearchParams): Promise<Document> {
  const url = params ? `${path}?${params.toString()}` : path
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return new DOMParser().parseFromString(html, 'text/html')
}

// Same idea as fetchLegacyDocument, for callers whose own parsers work on
// raw text/regex instead of a DOMParser Document (this app's newer scraped
// pages — see banking.queries.ts, loans.queries.ts) — checks for the login
// page via looksLikeLegacyLoginPageText instead of a DOM query.
export async function fetchLegacyText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, { credentials: 'same-origin', ...init })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return text
}

// Dolibarr's session-expiry redirect for a JSON AJAX endpoint isn't a 401/403
// — it's a 200 with the classic login page's HTML instead of JSON (confirmed
// live: bankentries_list_ajax.php et al return this exact shape when
// DOLSESSID is missing/expired), which a bare `res.json()` fails on with a
// cryptic "Unexpected token '<'" instead of a message anyone could act on.
// Every real-JSON-API fetch in this app should go through this instead of
// calling res.json() directly.
export async function parseLegacyJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return JSON.parse(text) as T
}

// axios hands back the raw text when a "JSON" endpoint (the DataTables
// *_ajax_list.php ones) answers with something else: the login page when the
// legacy session is gone, or a PHP notice printed ahead of the JSON (dev
// backends run with xdebug). Reading `.aaData ?? []` off that string showed an
// empty list as if there were no records — the dashboard's "No sales yet" with
// 294 invoices on the server. A notice-prefixed answer still parses from its
// first `{"`; anything else is an error the page can show.
export function legacyJsonBody<T>(data: unknown, source: string): T {
  if (data && typeof data === 'object') return data as T
  const text = typeof data === 'string' ? data : ''
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const start = text.indexOf('{"')
  if (start >= 0) {
    try {
      return JSON.parse(text.slice(start)) as T
    } catch {
      // not JSON after all — reported below
    }
  }
  throw new Error(`${source} sent back something other than its data. Reload the page to try again.`)
}

// A backend page that refuses to open — a module switched off in setup, a
// missing permission — prints toastr.error("…") and redirects to the home
// page, so the page the caller asked for never arrives. Those messages are
// the backend's own explanation ("Value Credit Notes are not enabled. …");
// reading them lets a native page say the same instead of "not recognised".
const TOASTR_ERROR = /toastr\.error\("((?:[^"\\]|\\.)*)"\)/g

function unescapeToast(raw: string): string {
  return raw
    .replace(/\\\//g, '/')
    .replace(/\\(["'\\])/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export function legacyRefusalMessages(source: string | Document): string[] {
  const text = typeof source === 'string' ? source : Array.from(source.scripts, (s) => s.textContent ?? '').join('\n')
  return Array.from(text.matchAll(TOASTR_ERROR), (m) => unescapeToast(m[1])).filter(Boolean)
}

// The message to show when a page's expected content is missing: the
// backend's own refusal when it gave one, otherwise the caller's fallback.
export function legacyMissingContentError(source: string | Document, fallback: string): Error {
  return new Error(legacyRefusalMessages(source)[0] ?? fallback)
}
