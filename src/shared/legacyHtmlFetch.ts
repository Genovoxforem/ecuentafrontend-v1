// Shared fetch helper for client-side "scrape a legacy Dolibarr page since no
// REST API exists" data sources (General Ledger/Journals, Warehouse stats —
// see each feature's own *HtmlParser.ts for the page-specific markup notes).
// Same-origin, relying on the DOLSESSID cookie establishLegacySession sets
// at login (see features/auth/legacySession.ts).

export async function fetchLegacyDocument(path: string, params?: URLSearchParams): Promise<Document> {
  const url = params ? `${path}?${params.toString()}` : path
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  return new DOMParser().parseFromString(html, 'text/html')
}

export const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. This data has no REST API and reads the real Dolibarr page directly — log out and back in to refresh that session, then retry.'
