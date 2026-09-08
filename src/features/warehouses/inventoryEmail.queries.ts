import { useQuery, useMutation } from '@tanstack/react-query'
import { parseInventoryEmailDefaults, type InventoryEmailDefaults } from './inventoryEmail'

// GET action=presend&mode=init — same real trigger as orderEmail.queries.ts
// uses: seeds the PHP session with this inventory's presend state before
// showing our own compose UI.
export function useInventoryEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<InventoryEmailDefaults>({
    queryKey: ['warehouses', 'inventoryDetail', id, 'emailDefaults'],
    queryFn: async () => {
      const res = await fetch(`/product/inventory/card.php?id=${id}&action=presend&mode=init`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseInventoryEmailDefaults(await res.text())
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendInventoryEmailInput {
  id: string
  token: string
  returnUrl: string
  fromtype: string
  sendto: string
  sendtocc: string
  subject: string
  message: string
}

// POST straight to product/inventory/card.php?id=X with the exact real
// field names read off the live presend form (action=send, models=
// "inventory", trackid="stockinv"+id) — see inventoryEmail.ts's header
// comment. Real backend action (genuine SMTP send via CMailFile), not a
// scrape.
export function useSendInventoryEmail() {
  return useMutation({
    mutationFn: async (input: SendInventoryEmailInput) => {
      const body = new FormData()
      body.append('token', input.token)
      body.append('trackid', `stockinv${input.id}`)
      body.append('inreplyto', '')
      body.append('fromname', '')
      body.append('frommail', '')
      body.append('langsmodels', 'en_US')
      body.append('action', 'send')
      body.append('models', 'inventory')
      body.append('models_id', '')
      body.append('id', input.id)
      body.append('returnurl', input.returnUrl)
      body.append('fromtype', input.fromtype)
      body.append('sendto', input.sendto)
      body.append('sendtocc', input.sendtocc)
      body.append('subject', input.subject)
      body.append('message', input.message)
      body.append('removedfile', '')
      body.append('sendmail', 'Send email')

      const res = await fetch(`/product/inventory/card.php?id=${input.id}`, {
        method: 'POST',
        credentials: 'same-origin',
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      // This theme surfaces a failed send via an inline showToast(msg, "error")
      // script call, not the static `<div class="error">` banner Dolibarr
      // normally renders — confirmed live: a real SMTP failure ("Failed to
      // send mail with php mail to HOST=localhost, PORT=25" — no mail server
      // configured on this dev backend) only ever showed up this way, never
      // as a div. Checking for the div too costs nothing and matches the
      // sibling Order/Quotation/PurchaseOrder send-email implementations'
      // own (likely equally stale) assumption.
      const toastErrorMatch = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/)
      const divErrorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      const rawMessage = toastErrorMatch?.[1] ?? divErrorMatch?.[1]
      if (rawMessage) {
        const div = document.createElement('div')
        div.innerHTML = rawMessage.replace(/\\'/g, "'").replace(/\\n/g, ' ')
        throw new Error((div.textContent ?? 'The legacy backend rejected this email.').trim())
      }
    },
  })
}
