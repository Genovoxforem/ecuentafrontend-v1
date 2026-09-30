import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// compta/tva/card.php?action=create — Dolibarr's "VAT - New" form. The page
// renders the CSRF token plus the bank-account and payment-type option lists;
// saving is a classic form POST (action=add) that redirects to
// card.php?id=<new id> on success and re-renders the form with a
// showToast("...", "error") message when a required field is missing.
const PATH = '/compta/tva/card.php'

export interface SalesTaxOption {
  value: string
  label: string
}

export interface SalesTaxCreateForm {
  token: string
  bankAccounts: SalesTaxOption[]
  paymentTypes: SalesTaxOption[]
  defaultLabels: { payment: string; refund: string }
  defaultDate: string // MM/dd/yyyy
}

function options(doc: Document, name: string): SalesTaxOption[] {
  return Array.from(doc.querySelectorAll<HTMLOptionElement>(`select[name="${name}"] option`)).map((o) => ({
    value: o.value,
    label: (o.textContent ?? '').replace(/\s+/g, ' ').trim(),
  }))
}

export function parseSalesTaxCreate(doc: Document): SalesTaxCreateForm {
  const form = Array.from(doc.querySelectorAll('form')).find((f) => f.querySelector('[name="accountid"]'))
  const radio = (v: string) => form?.querySelector<HTMLInputElement>(`input[name="refund"][value="${v}"]`)?.dataset.label ?? ''
  return {
    token: form?.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? '',
    bankAccounts: options(doc, 'accountid'),
    paymentTypes: options(doc, 'type_payment'),
    defaultLabels: { payment: radio('0') || 'Sales tax payment', refund: radio('1') || 'Sales tax refund' },
    defaultDate: form?.querySelector<HTMLInputElement>('input[name="datep"]')?.value ?? '',
  }
}

export function useSalesTaxCreateForm() {
  return useQuery({
    queryKey: ['generalLedger', 'salesTaxCreate'],
    queryFn: async () => parseSalesTaxCreate(await fetchLegacyDocument(PATH, new URLSearchParams({ action: 'create' }))),
    staleTime: 0,
    gcTime: 0, // the CSRF token must not outlive the page
  })
}

export interface SalesTaxInput {
  token: string
  refund: boolean
  datep: string // MM/dd/yyyy
  datev: string
  label: string
  amount: string
  accountid: string
  typePayment: string
  numPayment: string
}

function dateFields(prefix: 'datep' | 'datev', us: string): Record<string, string> {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? { [prefix]: us, [`${prefix}month`]: m[1], [`${prefix}day`]: m[2], [`${prefix}year`]: m[3] } : { [prefix]: '' }
}

// The backend reports validation failures only through a showToast() call in
// an inline script, so pull the message text back out of it.
function extractError(html: string): string {
  const m = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"/)
  if (!m) return 'The backend did not accept this sales tax entry.'
  return m[1]
    .replace(/\\n/g, '\n')
    .replace(/\\(['"\\])/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')
}

export function useCreateSalesTax() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalesTaxInput): Promise<{ id: string | null }> => {
      const body = new URLSearchParams({
        token: input.token,
        action: 'add',
        refund: input.refund ? '1' : '0',
        ...dateFields('datep', input.datep),
        ...dateFields('datev', input.datev),
        label: input.label,
        amount: input.amount,
        accountid: input.accountid,
        type_payment: input.typePayment,
        num_payment: input.numPayment,
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
      throw new Error(extractError(html))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
