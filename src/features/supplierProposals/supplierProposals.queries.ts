import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText, legacyMissingContentError, legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { parseSupplierProposalRows, type SupplierProposalAjaxResponse, type SupplierProposalRow } from './supplierProposalListParser'

export type { SupplierProposalRow }

export interface SupplierProposalsSummary {
  totalProposals: number
  proposalsThisMonth: number
  totalProposalAmount: number
  validatedCount: number
  draftCount: number
  proposals: SupplierProposalRow[]
}

// yyyy-mm-dd -> MM/DD/YYYY, the real page's own date range format.
function toLegacyDateSlash(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export interface SupplierProposalRange {
  from: string // yyyy-mm-dd, '' = from the beginning
  to: string // yyyy-mm-dd, '' = no end
}

// supplier_proposal/supplier_proposal_ajax.php — the real DataTables endpoint
// behind supplier_proposal/list.php. With no date filter the backend quietly
// limits the list to the current month, so an open range is sent as an explicit
// "everything" range instead, which is what "All supplier proposal records" needs.
export function useSupplierProposals(range: SupplierProposalRange) {
  return useQuery({
    queryKey: ['supplier-proposals', 'list', range],
    queryFn: async (): Promise<SupplierProposalRow[]> => {
      const body = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '-1',
        datefilter: `${toLegacyDateSlash(range.from || '2000-01-01')} - ${toLegacyDateSlash(range.to || '2099-12-31')}`,
      })
      const text = await fetchLegacyText('/supplier_proposal/supplier_proposal_ajax.php', { method: 'POST', body })
      return parseSupplierProposalRows(JSON.parse(text) as SupplierProposalAjaxResponse)
    },
    // Keep the rows on screen while a new date range loads.
    placeholderData: keepPreviousData,
  })
}

// The summary cards, worked out from the real rows: "validated" is every proposal
// that has left Draft (open, accepted, refused or closed).
export function summarizeSupplierProposals(rows: SupplierProposalRow[]): SupplierProposalsSummary {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const draftCount = rows.filter((r) => r.status.toLowerCase() === 'draft').length
  return {
    totalProposals: rows.length,
    proposalsThisMonth: rows.filter((r) => r.createdIso.startsWith(thisMonth)).length,
    totalProposalAmount: rows.reduce((sum, r) => sum + r.amountExclTax, 0),
    validatedCount: rows.length - draftCount,
    draftCount,
    proposals: rows,
  }
}

// ── New price request (supplier_proposal/card.php?action=create) — real ─────

export interface SupplierProposalFormOption {
  value: string
  label: string
}

export interface SupplierProposalCreateFormData {
  vendors: SupplierProposalFormOption[]
  paymentTerms: SupplierProposalFormOption[]
  paymentTypes: SupplierProposalFormOption[]
  bankAccounts: SupplierProposalFormOption[]
  shippingMethods: SupplierProposalFormOption[]
  templates: SupplierProposalFormOption[]
  projects: SupplierProposalFormOption[]
  currencies: SupplierProposalFormOption[]
  defaultTemplate: string
  defaultCurrency: string
}

// The legacy page's markup is malformed enough that a parsed <form>'s controls are
// not its descendants, so everything is looked up on the document (each name is
// unique on this page). Placeholder options ("Select a …", value '', '-1' or '0')
// are left out — the form shows its own.
function readSelect(doc: Document, name: string): { options: SupplierProposalFormOption[]; selected: string } {
  const select = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  const all = Array.from(select?.options ?? [])
  return {
    options: all
      .filter((o) => !['', '-1', '0'].includes(o.value.trim()))
      // A vendor's option label carries its codes on further lines — the name is the first.
      .map((o) => ({ value: o.value, label: (o.textContent ?? '').split('\n')[0].replace(/\s+/g, ' ').trim() })),
    selected: all.find((o) => o.hasAttribute('selected'))?.value ?? '',
  }
}

export function useSupplierProposalCreateForm() {
  return useQuery({
    queryKey: ['supplier-proposals', 'createForm'],
    queryFn: async (): Promise<SupplierProposalCreateFormData> => {
      const doc = await fetchLegacyDocument('/supplier_proposal/card.php', new URLSearchParams({ action: 'create' }))
      if (!doc.querySelector('select[name="socid"]')) throw legacyMissingContentError(doc, 'The price request form on this backend page was not recognised.')
      const template = readSelect(doc, 'model')
      const currency = readSelect(doc, 'multicurrency_code')
      return {
        vendors: readSelect(doc, 'socid').options,
        paymentTerms: readSelect(doc, 'cond_reglement_id').options,
        paymentTypes: readSelect(doc, 'mode_reglement_id').options,
        bankAccounts: readSelect(doc, 'fk_account').options,
        shippingMethods: readSelect(doc, 'shipping_method_id').options,
        templates: template.options,
        projects: readSelect(doc, 'projectid').options,
        currencies: currency.options,
        defaultTemplate: template.selected,
        defaultCurrency: currency.selected,
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}

export interface NewSupplierProposalInput {
  vendorId: string
  paymentTermsId: string
  paymentTypeId: string
  bankAccountId: string
  shippingMethodId: string
  deliveryDate: string // yyyy-mm-dd, '' = none
  template: string
  projectId: string
  currency: string
}

// The same POST the real form sends (token, action=add, socid, payment terms/type,
// bank account, shipping method, the delivery date as MM/dd/yyyy plus its day,
// month and year parts, doc template, project, currency). The token is scraped
// fresh off the create page right before. The result is a draft price request:
// success is a redirect to card.php?id=<new id>, a refusal re-shows the form with
// the reason in an inline toast (still HTTP 200).
export function useCreateSupplierProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewSupplierProposalInput): Promise<string> => {
      const createDoc = await fetchLegacyDocument('/supplier_proposal/card.php', new URLSearchParams({ action: 'create' }))
      const token = createDoc.querySelector<HTMLInputElement>('input[name="token"]')?.value
      if (!token) throw legacyMissingContentError(createDoc, 'Could not find a CSRF token on the price request page.')

      const [y, m, d] = input.deliveryDate ? input.deliveryDate.split('-') : ['', '', '']
      const body = new URLSearchParams({
        token,
        action: 'add',
        socid: input.vendorId,
        cond_reglement_id: input.paymentTermsId || '0',
        mode_reglement_id: input.paymentTypeId,
        fk_account: input.bankAccountId || '-1',
        shipping_method_id: input.shippingMethodId || '-1',
        liv_: input.deliveryDate ? `${m}/${d}/${y}` : '',
        liv_day: d,
        liv_month: m,
        liv_year: y,
        model: input.template,
        projectid: input.projectId || '0',
        multicurrency_code: input.currency,
        createmode: 'empty',
      })
      const res = await fetch('/supplier_proposal/card.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)

      const landed = new URL(res.url)
      const createdId = landed.searchParams.get('id')
      if (createdId && /^\d+$/.test(createdId)) return createdId
      const refusal = toastMessages(html).find((t) => t.type === 'error')?.message ?? legacyRefusalMessages(html)[0]
      if (refusal) throw new Error(refusal)
      // No reason given: a redirect away from the form still means it was created;
      // being handed the form back means it was not.
      if (!landed.pathname.endsWith('/supplier_proposal/card.php')) return ''
      throw new Error('The backend did not create the price request.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-proposals'] })
    },
  })
}
