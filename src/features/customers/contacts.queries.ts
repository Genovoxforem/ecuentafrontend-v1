import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchContacts,
  createContact,
  type ContactRow as FapiContactRow,
  type ContactType,
  type CreateContactInput,
} from '../../api/contacts'

// Re-export for components that import from this module
export type ContactRow = FapiContactRow

export type ContactKind = 'customer' | 'vendor'

export interface ContactsPayload {
  items: ContactRow[]
  total: number
}

/**
 * Contacts list — uses the bearer-token-authenticated fapi endpoint:
 *   GET /contact/fapi/list.php
 *
 * Wraps the existing Dolibarr Contact business class (llx_socpeople).
 * Replaces the old /contact/contacts-addresses-list-ajax.php call which
 * required the DOLSESSID session cookie and only returned 6 columns.
 */
export function useContacts(kind: ContactKind, search: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['contacts', kind, search, page, limit],
    queryFn: async (): Promise<ContactsPayload> => {
      const type: ContactType = kind === 'vendor' ? 'vendor' : 'customer'
      const { items, pagination } = await fetchContacts({
        type,
        search: search || undefined,
        page,
        limit,
        sort: 'lastname',
        direction: 'asc',
      })
      return { items, total: pagination.total }
    },
    placeholderData: (prev) => prev,
  })
}

export interface NewContactInput {
  companyId: string
  firstName?: string
  lastName?: string
  jobPosition?: string
  address?: string
  town?: string
  zip?: string
  email?: string
  phonePro?: string
  phoneMobile?: string
}

/**
 * Create contact — uses the bearer-token-authenticated fapi endpoint:
 *   POST /contact/fapi/create.php
 *
 * Wraps Contact::create() so hooks/triggers fire. No longer needs the
 * session-cookie-based societe/api/contacts.php or a CSRF token.
 */
export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewContactInput) => {
      const payload: CreateContactInput = {
        lastname: input.lastName || input.firstName || '',
        firstname: input.firstName || '',
        poste: input.jobPosition || '',
        address: input.address || '',
        town: input.town || '',
        zip: input.zip || '',
        email: input.email || '',
        phone_pro: input.phonePro || '',
        phone_mobile: input.phoneMobile || '',
        socid: input.companyId ? Number(input.companyId) : undefined,
      }
      const result = await createContact(payload)
      return { id: result.id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
