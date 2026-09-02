// Native "Send email" compose form for a Quotation — backed by Dolibarr's
// own real, stock core mechanism (comm/propal/card.php includes the
// unmodified core/actions_sendmails.inc.php, confirmed by reading the
// source directly, models='propal_send') — the exact same real mechanism
// already used for Sales Orders (see salesOrders/orderEmail.ts), just a
// different module. Verified live against a real quotation (id=1): real
// trackid="pro1", real default subject "Submission of commercial proposal
// PR2604-0001" pulled from the actual ref.

export interface SenderOption {
  value: string
  label: string
}

export interface QuotationEmailDefaults {
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

export function parseQuotationEmailDefaults(html: string): QuotationEmailDefaults {
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
