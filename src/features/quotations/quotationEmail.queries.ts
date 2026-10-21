import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchQuotationEmailDefaults,
  sendQuotationEmail,
} from '../../api/quotations'
import type { QuotationEmailDefaults } from './quotationEmail'

export function useQuotationEmailDefaults(id: string | undefined, enabled: boolean) {
  return useQuery<QuotationEmailDefaults>({
    queryKey: ['quotations', 'detail', id, 'emailDefaults'],
    queryFn: async () => {
      const response = await fetchQuotationEmailDefaults(Number(id))
      return {
        senderOptions: response.sender_options,
        defaultFromType: response.default_from_type,
        recipients: response.recipients,
        defaultSubject: response.default_subject,
        defaultMessage: response.default_message,
        attachedFile: response.attached_file,
      }
    },
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SendQuotationEmailInput {
  id: string
  fromtype: string
  sendto: string
  sendtocc: string
  sendtobcc?: string
  subject: string
  message: string
  attachments: File[]
}

export function useSendQuotationEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SendQuotationEmailInput) =>
      sendQuotationEmail({
        ...input,
        id: Number(input.id),
        attach_doc: true,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', input.id, 'agenda'] })
    },
  })
}
