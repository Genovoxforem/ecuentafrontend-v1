import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// The "Create a donation" form on don/fapi: its dropdowns from meta.php, the donation saved through donation.php?action=create.

export interface Option {
  value: string
  label: string
}

export interface DonationCreateForm {
  token: string
  currency: string
  countries: Option[]
  paymentTypes: Option[]
  projects: Option[]
}

// don/fapi/meta.php — the new-donation dropdowns. Payment modes are posted by code, countries and projects by id.
interface FapiDonationMeta {
  payment_modes: Array<{ id: number; code: string; label: string }>
  countries: Array<{ id: number; code: string; label: string }>
  projects: Array<{ id: number; ref?: string; title?: string; label?: string }>
  currency: string
}

export function mapDonationMeta(m: FapiDonationMeta): DonationCreateForm {
  return {
    token: '',
    currency: m.currency,
    countries: [{ value: '0', label: '' }, ...m.countries.map((c) => ({ value: String(c.id), label: c.label }))],
    paymentTypes: [{ value: '', label: '' }, ...m.payment_modes.map((p) => ({ value: p.code, label: p.label }))],
    projects: [{ value: '0', label: '' }, ...m.projects.map((p) => ({ value: String(p.id), label: [p.ref, p.title ?? p.label].filter(Boolean).join(' - ') }))],
  }
}

export function useDonationCreateForm() {
  return useQuery({
    queryKey: ['generalLedger', 'donationCreate', 'fapi'],
    queryFn: async () => mapDonationMeta(await fapiGet<FapiDonationMeta>('/don/fapi/meta.php')),
    staleTime: 10 * 60_000,
  })
}

export interface DonationInput {
  token: string
  date: string // MM/dd/yyyy
  amount: string
  isPublic: string // "1" | "0"
  company: string
  lastname: string
  firstname: string
  address: string
  zipcode: string
  town: string
  country: string
  email: string
  paymentType: string
  notePublic: string
  notePrivate: string
  project: string
}

// Date as MM/dd/yyyy (the form's own format) -> yyyy-MM-dd.
const isoDate = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const orNull = (v: string) => (v.trim() === '' ? null : v.trim())

// don/fapi/donation.php?action=create: only date and amount are required. The document lists date, amount, public, societe, email,
// modepayment and country_id; the other fields are sent under Dolibarr's own property names and come back in `ignored_fields` if unknown.
export function donationBody(i: DonationInput) {
  return {
    date: isoDate(i.date), amount: Number(i.amount.replace(/,/g, '')), public: Number(i.isPublic), societe: orNull(i.company), lastname: orNull(i.lastname),
    firstname: orNull(i.firstname), address: orNull(i.address), zip: orNull(i.zipcode), town: orNull(i.town), country_id: Number(i.country) || 0, email: orNull(i.email),
    modepayment: orNull(i.paymentType), note_public: orNull(i.notePublic), note_private: orNull(i.notePrivate), fk_project: Number(i.project) || null,
  }
}

export function useCreateDonation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (i: DonationInput): Promise<{ id: string }> => {
      const res = await fapiPost<{ id: number }>('/don/fapi/donation.php', donationBody(i), { action: 'create' })
      return { id: String(res.id) }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
