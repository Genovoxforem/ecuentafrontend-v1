// Native "Send email" compose form for a Sales Order — backed by Dolibarr's
// own real, stock core mechanism (commande/card.php includes the unmodified
// core/actions_sendmails.inc.php, confirmed by reading the source directly)
// rather than anything custom-built for this app. This is a real, working
// backend action (actual SMTP send via CMailFile) — verified by reading
// core/tpl/card_presend.tpl.php's real rendered output for order id=125,
// not guessed. We replicate its exact field names and POST straight to the
// same real endpoint, same-origin/session-cookie authenticated like every
// other legacy-integrated feature in this app.
//
// Dolibarr auto-attaches the order's most-recently-generated document (e.g.
// CO2608-0074.pdf) via server-side PHP SESSION state populated by the GET
// `action=presend&mode=init` request itself (confirmed: the real form shows
// this attachment with no client-supplied file identifier anywhere in its
// fields, so it can only be session-side) — fetching that endpoint once
// before showing our own compose UI reproduces that same session state, so
// the same document still attaches automatically on send.

export interface SenderOption {
  value: string
  label: string
}

export interface OrderEmailDefaults {
  token: string
  returnUrl: string
  senderOptions: SenderOption[]
  defaultSubject: string
  defaultMessage: string
  attachedFileName: string
}

function decodeEntities(s: string): string {
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent ?? ''
}

export function parseOrderEmailDefaults(html: string): OrderEmailDefaults {
  const token = html.match(/name="token" value="([^"]*)"/)?.[1] ?? ''
  const returnUrl = html.match(/name="returnurl" value="([^"]*)"/)?.[1] ?? ''

  const fromtypeMatch = html.match(/<select[^>]*name="fromtype"[^>]*>([\s\S]*?)<\/select>/)
  const senderOptions: SenderOption[] = []
  if (fromtypeMatch) {
    const optionRe = /<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g
    let m: RegExpExecArray | null
    while ((m = optionRe.exec(fromtypeMatch[1]))) {
      // The option's own text is double-entity-encoded in the real markup
      // (e.g. "&amp;lt;" rather than "&lt;") — confirmed live: select2's own
      // JS normally swaps this display for the (singly-encoded) data-html
      // attribute instead, which we don't run here, so this decodes twice
      // to reach the same plain "Name <email>" text a real user would see.
      senderOptions.push({ value: m[1], label: decodeEntities(decodeEntities(m[2])).replace(/\s+/g, ' ').trim() })
    }
  }

  const defaultSubject = html.match(/id="subject" name="subject" value="([^"]*)"/)?.[1] ?? ''
  const defaultMessage = decodeEntities(html.match(/id="message" name="message"[^>]*>([\s\S]*?)<\/textarea>/)?.[1] ?? '').trim()
  const attachedFileName = html.match(/id="attachfile_0">[\s\S]*?<\/i>([^<]*)<a/)?.[1]?.trim() ?? ''

  return { token, returnUrl, senderOptions, defaultSubject, defaultMessage, attachedFileName }
}
