import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

export type ContactKind = 'customer' | 'vendor'

// GET/POST /api/contacts/ (api/contacts/index.php) — real, built for this
// app against llx_socpeople (kind=customer|vendor filters by the linked
// company's client/fournisseur flag, matching how the legacy Sales >
// Customer Contact and Purchases > Vendor Contact pages both read the same
// table). No update/delete route exists yet, so this only covers list +
// create. civility/jobPosition are distinct real columns (title dropdown
// code vs free-text job position) — the legacy form shows both separately.
export interface ContactRow {
  id: number
  firstName: string | null
  lastName: string | null
  fullName: string
  companyName: string | null
  civility: string | null
  jobPosition: string | null
  address: string | null
  town: string | null
  zip: string | null
  email: string | null
  phonePro: string | null
  phonePerso: string | null
  phoneMobile: string | null
  fax: string | null
  birthday: string | null
  country: string | null
  priv: boolean
  statusCode: number
  statusLabel: 'Enabled' | 'Disabled'
  entity: number
  facebook: string | null
  twitter: string | null
  linkedin: string | null
  whatsapp: string | null
}

interface ContactsPayload {
  items: ContactRow[]
  total: number
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

export function useContacts(kind: ContactKind, search: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['contacts', kind, search, page, limit],
    queryFn: async (): Promise<ContactsPayload> => {
      const { data } = await api.get<WebEnvelope<ContactsPayload>>('/contacts/', {
        params: { kind, search: search || undefined, page, limit },
      })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}

export interface NewContactInput {
  companyId?: string
  civility?: string
  firstName?: string
  lastName?: string
  jobPosition?: string
  address?: string
  town?: string
  zip?: string
  email?: string
  phonePro?: string
  phonePerso?: string
  phoneMobile?: string
  fax?: string
  birthday?: string
  countryId?: string
  priv?: boolean
  facebook?: string
  twitter?: string
  linkedin?: string
  whatsapp?: string
  // Real llx_categorie_contact links (see api/categories/?type=4) — the
  // backend creates one junction row per id after the contact is inserted.
  categoryIds?: number[]
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewContactInput) => {
      const { data } = await api.post<WebEnvelope<{ id: number }>>('/contacts/', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
