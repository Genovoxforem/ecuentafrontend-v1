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

export async function fetchLegacyDocument(path: string, params?: URLSearchParams): Promise<Document> {
  const url = params ? `${path}?${params.toString()}` : path
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
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
