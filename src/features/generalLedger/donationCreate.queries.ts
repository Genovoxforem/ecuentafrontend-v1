import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'

// don/card.php?action=create — Dolibarr's "Create a donation" form. The page
// renders the CSRF token and the option lists (countries, payment types,
// projects); saving is a classic form POST (action=add) that redirects to
// card.php?id=<new id> on success and re-renders the form with a
// showToast("…", "error") message when Date or Amount is missing (see the PHP:
// only those two are required). The visible Country <select> on the real page
// has an empty name attribute, so the original never posts a country; the PHP
// itself reads `country_id`, so this form sends it and the country is kept.
const PATH = '/don/card.php'

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

// Read from the whole document, not the <form> element: this page's markup is
// not well-formed, so the browser's parser can split the form apart.
const optionsOf = (doc: Document, selector: string): Option[] =>
  Array.from(doc.querySelectorAll<HTMLOptionElement>(`${selector} option`)).map((o) => ({ value: o.value, label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() }))

export function parseDonationCreate(doc: Document): DonationCreateForm {
  const amount = doc.querySelector('[name="amount"]')
  // The country select is the one holding the "Select Country" placeholder.
  const country = Array.from(doc.querySelectorAll('select')).find((s) => Array.from(s.options).some((o) => /select country/i.test(o.text)))
  return {
    token: doc.querySelector<HTMLInputElement>('form[action*="card.php"] input[name="token"]')?.value ?? doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? '',
    currency: (amount?.parentElement?.querySelector('.input-group-text')?.textContent ?? '').trim(),
    countries: Array.from(country?.options ?? []).map((o) => ({ value: o.value, label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() })),
    paymentTypes: optionsOf(doc, 'select[name="modepayment"]'),
    projects: optionsOf(doc, 'select[name="fk_project"]'),
  }
}

export function useDonationCreateForm() {
  return useQuery({
    queryKey: ['generalLedger', 'donationCreate'],
    queryFn: async () => parseDonationCreate(await fetchLegacyDocument(PATH, new URLSearchParams({ action: 'create' }))),
    staleTime: 0,
    gcTime: 0, // the CSRF token must not outlive the page
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

function dateFields(us: string): Record<string, string> {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? { re: us, remonth: m[1], reday: m[2], reyear: m[3] } : { re: '', remonth: '', reday: '', reyear: '' }
}

export function useCreateDonation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (i: DonationInput): Promise<{ id: string }> => {
      const body = new URLSearchParams({
        token: i.token,
        action: 'add',
        ...dateFields(i.date),
        amount: i.amount,
        public: i.isPublic,
        societe: i.company,
        lastname: i.lastname,
        firstname: i.firstname,
        address: i.address,
        zipcode: i.zipcode,
        town: i.town,
        country_id: i.country,
        email: i.email,
        modepayment: i.paymentType,
        note_public: i.notePublic,
        note_private: i.notePrivate,
        fk_project: i.project,
      })
      const res = await fetch(PATH, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      // Success redirects to card.php?id=N; anything else is the form again.
      const id = new URL(res.url).searchParams.get('id')
      if (id) return { id }
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const err = toastMessages(html).find((m) => m.type === 'error')
      throw new Error(err?.message ?? 'The backend did not accept this donation.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
