import { useQuery, useMutation } from '@tanstack/react-query'
import { parseOrderEmailDefaults, type OrderEmailDefaults } from './orderEmail'

// GET action=presend&mode=init — see orderEmail.ts's header comment for why
// this call itself (not just its parsed HTML) matters: it seeds the real
// PHP SESSION with the order's latest generated document as a pending
// attachment, same as loading the real legacy form would.
export function useOrderEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<OrderEmailDefaults>({
    queryKey: ['salesOrders', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const res = await fetch(`/commande/card.php?id=${id}&action=presend&mode=init`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseOrderEmailDefaults(await res.text())
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendOrderEmailInput {
  id: string
  token: string
  returnUrl: string
  fromtype: string
  sendto: string
  sendtocc: string
  subject: string
  message: string
  attachments: File[]
}

// POST straight to the real commande/card.php?id=X endpoint with the exact
// field names read off the real presend form (action=send, models=
// order_send, trackid=ord<id>, sendmail=<submit button's own name/value>,
// etc.) — see orderEmail.ts's header comment. Real backend action, not a
// scrape: this is Dolibarr's own stock core/actions_sendmails.inc.php
// handling a genuine SMTP send, included unmodified by commande/card.php.
export function useSendOrderEmail() {
  return useMutation({
    mutationFn: async (input: SendOrderEmailInput) => {
      const body = new FormData()
      body.append('token', input.token)
      body.append('trackid', `ord${input.id}`)
      body.append('inreplyto', '')
      body.append('fromname', '')
      body.append('frommail', '')
      body.append('langsmodels', 'en_US')
      body.append('action', 'send')
      body.append('models', 'order_send')
      body.append('models_id', '')
      body.append('id', input.id)
      body.append('returnurl', input.returnUrl)
      body.append('fromtype', input.fromtype)
      body.append('sendto', input.sendto)
      body.append('sendtocc', input.sendtocc)
      body.append('subject', input.subject)
      body.append('message', input.message)
      body.append('removedfile', '')
      for (const file of input.attachments) body.append('addedfile[]', file)
      body.append('sendmail', 'Send email')

      const res = await fetch(`/commande/card.php?id=${input.id}`, {
        method: 'POST',
        credentials: 'same-origin',
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      // Dolibarr re-renders the same card page either way — a failed send
      // (bad recipient, SMTP error) shows a real "class=... error" banner;
      // success shows no such banner (and usually a "Mail sent" confirmation
      // div instead). Checked against real error/success markup, not guessed
      // format strings.
      const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      if (errorMatch) {
        const div = document.createElement('div')
        div.innerHTML = errorMatch[1]
        throw new Error((div.textContent ?? 'The legacy backend rejected this email.').trim())
      }
    },
  })
}
