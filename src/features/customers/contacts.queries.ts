import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { fetchSocieteFormContext } from './thirdPartyOptions.queries'

export type ContactKind = 'customer' | 'vendor'

// The dead /api/contacts/ this file used to call (api/contacts/index.php)
// does not exist on the active backend — confirmed live (404). Real sources
// found by reading the backend directly instead:
//
// List: contact/contacts-addresses-list-ajax.php — a genuine DataTables
// JSON endpoint over llx_socpeople joined to llx_societe (type=c filters
// client IN (1,2,3), type=f filters fournisseur=1), confirmed live against
// the real "List Of Contacts/Addresses" page's own data (Guru/Stephen/
// customer1 for customers; Ashok/Jerish/Andrew/... for vendors). It only
// selects 6 raw columns (rowid, firstname, lastname, code_client,
// code_fournisseur, phone, email) — no third-party name, visibility,
// environment or status, so those stay unavailable rather than guessed.
// The backend also hardcodes its own page size to 25 regardless of the
// `length` sent (`$length = 25;`, confirmed by reading the file) — the
// perPage selector still works for requesting page 2/3/etc via `start`,
// it just can't make a single page bigger than 25 server-side.
//
// Create: societe/api/contacts.php (POST) — real, full Contact::create()
// call, confirmed by reading that file directly. It's scoped to one
// company (?socid=X, via sc_api_load_societe()), so unlike the old fake
// endpoint a third-party is now a hard requirement, not optional — and it
// only accepts lastname/firstname/email/phone/phone_mobile/address/zip/
// town/poste(job position)/status. civility, fax, personal phone, country,
// visibility, birthday, tags and every Social Media field have no real
// backing anywhere in this API and are not sent.
interface RawContactListAjaxRow {
  rowid: string
  firstname: string
  lastname: string
  code_client: string | null
  code_fournisseur: string | null
  phone: string
  email: string
}

export interface ContactRow {
  id: number
  firstName: string | null
  lastName: string | null
  fullName: string
  thirdPartyCode: string | null
  email: string | null
  phone: string | null
}

interface ContactsPayload {
  items: ContactRow[]
  total: number
}

interface ContactsAjaxResponse {
  recordsTotal: string | number
  data: RawContactListAjaxRow[]
}

function toContactRow(r: RawContactListAjaxRow): ContactRow {
  return {
    id: Number(r.rowid),
    firstName: r.firstname || null,
    lastName: r.lastname || null,
    fullName: [r.firstname, r.lastname].filter(Boolean).join(' ') || r.lastname || r.firstname || '',
    thirdPartyCode: r.code_client || r.code_fournisseur || null,
    email: r.email || null,
    phone: r.phone || null,
  }
}

export function useContacts(kind: ContactKind, search: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['contacts', kind, search, page, limit],
    queryFn: async (): Promise<ContactsPayload> => {
      const body = new URLSearchParams({
        draw: '1',
        start: String((page - 1) * limit),
        length: String(limit),
        type: kind === 'vendor' ? 'f' : 'c',
        'order[0][column]': '0',
      })
      if (search) body.set('search[value]', search)
      const { data } = await axios.post<ContactsAjaxResponse>('/contact/contacts-addresses-list-ajax.php', body)
      return { items: (data.data ?? []).map(toContactRow), total: Number(data.recordsTotal) || 0 }
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

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewContactInput) => {
      const { token } = await fetchSocieteFormContext()
      const { data } = await axios.post<{ ok: boolean; error?: string; id?: number }>(
        `/societe/api/contacts.php?socid=${input.companyId}`,
        {
          token,
          lastname: input.lastName || input.firstName || '',
          firstname: input.firstName || '',
          poste: input.jobPosition || '',
          address: input.address || '',
          town: input.town || '',
          zip: input.zip || '',
          email: input.email || '',
          phone: input.phonePro || '',
          phone_mobile: input.phoneMobile || '',
        },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      )
      if (!data.ok) throw new Error(data.error ?? 'Failed to create contact')
      return { id: data.id ?? 0 }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
