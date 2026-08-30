// Shared helpers for the "ZRA gateway lookup" family of pages —
// custom/zra/saleszralist(ajax).php, customer.php, selectItems.php,
// selectrrpItems.php, rvat_agent.php — every one of them proxies live to
// the real Zambia Revenue Authority tax gateway via
// custom/zra/core/modules/zraworker.class.php::initialize(), confirmed by
// reading each file directly (not guessed, not a local DB read). Clicking
// "Fetch Details" on any of these in this app makes the exact same real
// external call the legacy page itself would make.

export function looksLikeZraLoginPage(doc: Document): boolean {
  return !!doc.querySelector('input[name="password"]') && !!doc.querySelector('input[name="username"]')
}

// selectItems.php/selectrrpItems.php/rvat_agent.php all embed the full ZRA
// gateway response as `var jsonData = {...};` inside a <script> tag on an
// otherwise full Dolibarr-chrome page (llxHeader/llxFooter) — there is no
// separate ajax endpoint for these, the whole page computes and prints it
// server-side on every load. Extracted here by scanning every <script> for
// the assignment rather than guessing which one, since a full page has many.
export function extractEmbeddedJsonData(doc: Document): unknown | null {
  const scripts = Array.from(doc.querySelectorAll('script'))
  for (const script of scripts) {
    const text = script.textContent ?? ''
    const match = text.match(/var\s+jsonData\s*=\s*(\{[\s\S]*?\});/)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        // keep scanning other scripts
      }
    }
  }
  return null
}

export interface ZraGatewayEnvelope {
  resultCd?: string
  resultMsg?: string
  data?: unknown
}
