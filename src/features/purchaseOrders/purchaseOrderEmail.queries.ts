import { useQuery, useMutation } from '@tanstack/react-query'
import { parseOrderEmailDefaults, type OrderEmailDefaults } from '../salesOrders/orderEmail'

// Real via fourn/commande/card.php — the exact same Dolibarr core sendmail
// mechanism as Sales Order's orderEmail.queries.ts (same generic parser
// applies, both use the stock Form::e-mail template), just modelmail=
// 'order_supplier_send' and trackid='sord<id>' (real value confirmed live:
// GET id=1 -> trackid="sord1", subject "Submission of order PO2604-0001").
export function usePurchaseOrderEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<OrderEmailDefaults>({
    queryKey: ['purchaseOrders', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const res = await fetch(`/fourn/commande/card.php?id=${id}&action=presend&mode=init`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseOrderEmailDefaults(await res.text())
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendPurchaseOrderEmailInput {
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

// Not live-tested by this pass (a real SMTP send is a live mutation with a
// real external side effect — requires per-instance approval).
export function useSendPurchaseOrderEmail() {
  return useMutation({
    mutationFn: async (input: SendPurchaseOrderEmailInput) => {
      const body = new FormData()
      body.append('token', input.token)
      body.append('trackid', `sord${input.id}`)
      body.append('inreplyto', '')
      body.append('fromname', '')
      body.append('frommail', '')
      body.append('langsmodels', 'en_US')
      body.append('action', 'send')
      body.append('models', 'order_supplier_send')
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

      const res = await fetch(`/fourn/commande/card.php?id=${input.id}`, {
        method: 'POST',
        credentials: 'same-origin',
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      if (errorMatch) {
        const div = document.createElement('div')
        div.innerHTML = errorMatch[1]
        throw new Error((div.textContent ?? 'The legacy backend rejected this email.').trim())
      }
    },
  })
}
