import { useQuery, useMutation } from '@tanstack/react-query'
import { parseOrderEmailDefaults, type OrderEmailDefaults } from '../salesOrders/orderEmail'

// The expense report's "Send Email" is Dolibarr's stock send-mail form on expensereport/card.php (the same
// mechanism as the sales/purchase order composers): modelmail 'expensereport', trackid 'exp<id>'.
export function useExpenseEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<OrderEmailDefaults>({
    queryKey: ['expenses', 'card', id, 'emailDefaults'],
    queryFn: async () => {
      const res = await fetch(`/expensereport/card.php?id=${id}&action=presend&mode=init`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseOrderEmailDefaults(await res.text())
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendExpenseEmailInput {
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

// A real SMTP send — not run against a real backend while building this.
export function useSendExpenseEmail() {
  return useMutation({
    mutationFn: async (input: SendExpenseEmailInput) => {
      const body = new FormData()
      body.append('token', input.token)
      body.append('trackid', `exp${input.id}`)
      body.append('inreplyto', '')
      body.append('fromname', '')
      body.append('frommail', '')
      body.append('langsmodels', 'en_US')
      body.append('action', 'send')
      body.append('models', 'expensereport')
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

      const res = await fetch(`/expensereport/card.php?id=${input.id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      if (errorMatch) {
        const div = document.createElement('div')
        div.innerHTML = errorMatch[1]
        throw new Error((div.textContent ?? 'The backend rejected this email.').trim())
      }
    },
  })
}
