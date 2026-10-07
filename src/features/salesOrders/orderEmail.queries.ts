import { useQuery, useMutation } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import axios from 'axios'
import type { OrderEmailDefaults } from './orderDetail.types'

// Backed by commande/fapi/email.php — the same CMailFile + ORDER_SENTBYMAIL
// trigger path as core/actions_sendmails.inc.php, exposed as JSON. The GET
// returns the same presend defaults (sender list, subject/message templates
// with substitutions resolved, the order's latest generated document as the
// pending attachment) that card.php?action=presend&mode=init renders.
export function useOrderEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<OrderEmailDefaults>({
    queryKey: ['salesOrders', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const res = await fapi.get<{ success: boolean; data: {
        sender_options?: { value: string; label: string }[]
        default_from_type?: string
        default_subject?: string
        default_message?: string
        attached_file?: { name: string } | null
      }; message: string | null }>(`/commande/fapi/email.php?id=${id}`)
      const d = res.data.data
      return {
        senderOptions: d.sender_options ?? [],
        defaultFromType: d.default_from_type ?? 'user',
        defaultSubject: d.default_subject ?? '',
        defaultMessage: d.default_message ?? '',
        attachedFileName: d.attached_file?.name ?? '',
      }
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendOrderEmailInput {
  id: string
  fromtype: string
  sendto: string
  sendtocc: string
  subject: string
  message: string
  attachments: File[]
}

// POST multipart to commande/fapi/email.php — attachments ride the same
// request (staged to the user's temp dir server-side), and the order's
// latest generated document is attached automatically unless attach_doc=0.
export function useSendOrderEmail() {
  return useMutation({
    mutationFn: async (input: SendOrderEmailInput) => {
      const body = new FormData()
      body.set('id', input.id)
      body.set('fromtype', input.fromtype)
      body.set('sendto', input.sendto)
      body.set('sendtocc', input.sendtocc)
      body.set('subject', input.subject)
      body.set('message', input.message)
      for (const file of input.attachments) body.append('attachments[]', file)
      try {
        const res = await fapi.post<{ success: boolean; message: string | null }>(`/commande/fapi/email.php`, body)
        if (res.data && res.data.success === false) throw new Error(res.data.message || 'Send failed.')
      } catch (e) {
        if (axios.isAxiosError(e)) {
          const msg = e.response?.data?.message
          throw new Error(typeof msg === 'string' ? msg : `Backend returned ${e.response?.status ?? 'no response'}.`)
        }
        throw e
      }
    },
  })
}
