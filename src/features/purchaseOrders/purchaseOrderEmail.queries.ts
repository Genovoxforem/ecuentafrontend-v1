import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { fapi } from '../../api/axios'
import { fapiGet } from '../../api/fapiEnvelope'
import { requireJson } from '../salesOrders/orderApi'
import type { OrderEmailDefaults } from '../salesOrders/orderDetail.types'
import type { SendOrderEmailInput } from '../salesOrders/orderEmail.queries'
import { PO_BASE } from './purchaseOrderFapi'

// fourn/commande/fapi/send_email.php: compose defaults (the vendor's contacts, the sender choices, the
// order_supplier_send template in the vendor's language, the latest generated document) and the send
// itself (CMailFile). It answers 409 for a draft. Same multipart contract as the sales order email.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function usePurchaseOrderEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<OrderEmailDefaults>({
    queryKey: ['purchaseOrders', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${PO_BASE}/send_email.php`, { id })
      return {
        senderOptions: d.sender_options ?? [],
        recipients: (d.recipients ?? []).map((r: any) => ({ ...r, email: r.email ?? String(r.label ?? '').match(/<([^<>@\s]+@[^<>\s]+)>/)?.[1] ?? '' })),
        defaultFromType: d.default_from_type ?? 'user',
        defaultSubject: d.default_subject ?? '',
        defaultMessage: d.default_message ?? '',
        attachedFileName: d.attached_file?.name ?? '',
        attachedFileSize: d.attached_file?.size ?? null,
      }
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useSendPurchaseOrderEmail() {
  return useMutation({
    mutationFn: async (input: SendOrderEmailInput) => {
      const body = new FormData()
      body.set('id', input.id)
      body.set('fromtype', input.fromtype)
      body.set('sendto', input.sendto)
      body.set('sendtocc', input.sendtocc)
      body.set('sendtobcc', input.sendtobcc)
      body.set('subject', input.subject)
      body.set('message', input.message)
      body.set('attach_doc', input.attachDoc ? '1' : '0')
      for (const file of input.attachments) body.append('attachments[]', file)
      try {
        const res = requireJson(await fapi.post<{ success: boolean; message: string | null }>(`${PO_BASE}/send_email.php`, body)).data
        if (!res.success) throw new Error(res.message || 'Send failed.')
      } catch (e) {
        if (axios.isAxiosError(e)) {
          const payload = e.response?.data as { message?: unknown } | undefined
          throw new Error(typeof payload?.message === 'string' ? payload.message : `Backend returned ${e.response?.status ?? 'no response'}.`)
        }
        throw e
      }
    },
  })
}
