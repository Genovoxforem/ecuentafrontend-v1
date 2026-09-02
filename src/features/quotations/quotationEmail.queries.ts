import { useQuery, useMutation } from '@tanstack/react-query'
import { parseQuotationEmailDefaults, type QuotationEmailDefaults } from './quotationEmail'

// GET action=presend&mode=init — see quotationEmail.ts's header comment.
export function useQuotationEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<QuotationEmailDefaults>({
    queryKey: ['quotations', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const res = await fetch(`/comm/propal/card.php?id=${id}&action=presend&mode=init`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseQuotationEmailDefaults(await res.text())
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendQuotationEmailInput {
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

// POST straight to the real comm/propal/card.php?id=X endpoint — same
// technique as useSendOrderEmail, models=propal_send, trackid=pro<id> (real
// value confirmed live). Not live-tested by this pass (a real SMTP send is
// a live mutation with a real external side effect — requires per-instance
// approval, same rule as any other mutation, just with higher stakes here).
export function useSendQuotationEmail() {
  return useMutation({
    mutationFn: async (input: SendQuotationEmailInput) => {
      const body = new FormData()
      body.append('token', input.token)
      body.append('trackid', `pro${input.id}`)
      body.append('inreplyto', '')
      body.append('fromname', '')
      body.append('frommail', '')
      body.append('langsmodels', 'en_US')
      body.append('action', 'send')
      body.append('models', 'propal_send')
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

      const res = await fetch(`/comm/propal/card.php?id=${input.id}`, {
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
