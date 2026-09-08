// Native "Send email" compose form for an Inventory record — same real
// Dolibarr stock mechanism as orderEmail.ts (product/inventory/card.php
// includes the unmodified core/actions_sendmails.inc.php, confirmed by
// reading the real rendered presend form for inventory id=1 directly, field
// names and all). Only real difference from the Order version: `models` is
// the literal string "inventory" (not "order_send" — the presend template's
// own comment says `$this->param["models"] = inventory`), and `trackid` is
// "stockinv" + id rather than "ord" + id — both read off the real form, not
// guessed.

export interface SenderOption {
  value: string
  label: string
}

export interface InventoryEmailDefaults {
  token: string
  returnUrl: string
  senderOptions: SenderOption[]
  defaultSubject: string
  defaultMessage: string
}

function decodeEntities(s: string): string {
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent ?? ''
}

export function parseInventoryEmailDefaults(html: string): InventoryEmailDefaults {
  const token = html.match(/name="token" value="([^"]*)"/)?.[1] ?? ''
  const returnUrl = html.match(/name="returnurl" value="([^"]*)"/)?.[1] ?? ''

  const fromtypeMatch = html.match(/<select[^>]*name="fromtype"[^>]*>([\s\S]*?)<\/select>/)
  const senderOptions: SenderOption[] = []
  if (fromtypeMatch) {
    const optionRe = /<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g
    let m: RegExpExecArray | null
    while ((m = optionRe.exec(fromtypeMatch[1]))) {
      senderOptions.push({ value: m[1], label: decodeEntities(decodeEntities(m[2])).replace(/\s+/g, ' ').trim() })
    }
  }

  const defaultSubject = html.match(/id="subject" name="subject" value="([^"]*)"/)?.[1] ?? ''
  const defaultMessage = decodeEntities(html.match(/id="message" name="message"[^>]*>([\s\S]*?)<\/textarea>/)?.[1] ?? '').trim()

  return { token, returnUrl, senderOptions, defaultSubject, defaultMessage }
}
