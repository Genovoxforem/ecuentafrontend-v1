import { legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'

// Sends one of a legacy admin page's own requests (form POST, or a GET link carrying an
// action). The backend answers with the whole page and no status, so success is judged
// by the caller re-reading the page; here only a refusal the page itself printed (an
// inline error toast or message) or a lost session is turned into an error.
export async function legacyAdminSend(path: string, init: RequestInit, query = ''): Promise<string> {
  const res = await fetch(`${path}${query}`, { credentials: 'same-origin', ...init })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const refusal = toastMessages(html).find((t) => t.type === 'error')?.message ?? legacyRefusalMessages(html)[0]
  if (refusal) throw new Error(refusal)
  return html
}
