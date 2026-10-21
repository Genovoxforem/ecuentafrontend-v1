import { useQuery, useMutation } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import axios from 'axios'
import { preferNewApi, requireJson } from './orderApi'
import type { OrderEmailDefaults } from './orderDetail.types'

interface EmailDefaultsResponse {
  success: boolean
  data: {
    sender_options?: { value: string; label: string }[]
    default_from_type?: string
    recipients?: { value: string; label: string }[]
    default_subject?: string
    default_message?: string
    attached_file?: { name: string; size?: number | null } | null
  }
  message: string | null
}

function mapEmailDefaults(response: EmailDefaultsResponse): OrderEmailDefaults {
  if (!response.success) throw new Error(response.message || 'Could not load email defaults.')
  const data = response.data
  return {
    senderOptions: data.sender_options ?? [],
    recipients: (data.recipients ?? []).map((recipient) => ({
      ...recipient,
      email: recipient.label.match(/<([^<>@\s]+@[^<>\s]+)>/)?.[1] ?? '',
    })),
    defaultFromType: data.default_from_type ?? 'user',
    defaultSubject: data.default_subject ?? '',
    defaultMessage: data.default_message ?? '',
    attachedFileName: data.attached_file?.name ?? '',
    attachedFileSize: data.attached_file?.size ?? null,
  }
}

export function useOrderEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<OrderEmailDefaults>({
    queryKey: ['salesOrders', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const response = await preferNewApi(
        'order-email',
        async () =>
          requireJson(
            await fapi.get<EmailDefaultsResponse>(`/commande/fapi/order.php?action=email_defaults&id=${encodeURIComponent(id!)}`),
          ).data,
        async () => (await fapi.get<EmailDefaultsResponse>(`/commande/fapi/email.php?id=${encodeURIComponent(id!)}`)).data,
      )
      return mapEmailDefaults(response)
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
  sendtobcc: string
  subject: string
  message: string
  attachDoc: boolean
  attachments: File[]
}

async function postOrderEmail(path: string, input: SendOrderEmailInput) {
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
  const response = requireJson(await fapi.post<{ success: boolean; message: string | null }>(path, body)).data
  if (!response.success) throw new Error(response.message || 'Send failed.')
}

export function useSendOrderEmail() {
  return useMutation({
    mutationFn: async (input: SendOrderEmailInput) => {
      try {
        await preferNewApi(
          'order-email',
          () => postOrderEmail('/commande/fapi/order.php?action=send_email', input),
          () => postOrderEmail('/commande/fapi/email.php', input),
        )
      } catch (e) {
        if (axios.isAxiosError(e)) {
          const payload = e.response?.data as { message?: unknown; errors?: unknown } | undefined
          const errors = Array.isArray(payload?.errors)
            ? payload.errors.map((error) => (typeof error === 'string' ? error : '')).filter(Boolean).join(' ')
            : ''
          const msg = typeof payload?.message === 'string' ? payload.message : errors
          throw new Error(msg || `Backend returned ${e.response?.status ?? 'no response'}.`)
        }
        throw e
      }
    },
  })
}
