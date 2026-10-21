import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

export interface SupplierProposalRow {
  id: number
  ref: string
  vendorId: number | null
  vendor: string
  // The dates as the lists print them (MM/DD/YYYY), and the same as ISO for sorting.
  validationDate: string
  validationIso: string
  plannedDelivery: string
  plannedDeliveryIso: string
  amountExclTax: number
  amountInclTax: number
  author: string
  status: string
  createdIso: string
}

export interface SupplierProposalsSummary {
  totalProposals: number
  proposalsThisMonth: number
  totalProposalAmount: number
  validatedCount: number
  draftCount: number
  proposals: SupplierProposalRow[]
}

export interface SupplierProposalRange {
  from: string // yyyy-mm-dd, '' = from the beginning
  to: string // yyyy-mm-dd, '' = no end
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// MM/DD/YYYY, the way the classic page prints a date (the list sorts and filters on the ISO form next to it).
function usFromIso(value: unknown): string {
  const m = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

function rowFromFapi(p: any): SupplierProposalRow {
  return {
    id: Number(p.id),
    ref: p.ref ?? '',
    vendorId: p.supplier?.id != null ? Number(p.supplier.id) : null,
    vendor: p.supplier?.name ?? '',
    validationDate: usFromIso(p.date_valid),
    validationIso: typeof p.date_valid === 'string' ? p.date_valid.slice(0, 10) : '',
    plannedDelivery: usFromIso(p.date_delivery),
    plannedDeliveryIso: typeof p.date_delivery === 'string' ? p.date_delivery.slice(0, 10) : '',
    amountExclTax: Number(p.total_ht) || 0,
    amountInclTax: Number(p.total_ttc) || 0,
    author: p.author?.name ?? p.author?.login ?? '',
    status: p.status_label ?? '',
    createdIso: typeof (p.date_creation ?? p.date) === 'string' ? String(p.date_creation ?? p.date).slice(0, 10) : '',
  }
}

// supplier_proposal/fapi/list.php: every row with the supplier as an object, real status codes and no hidden
// date default (an empty filter returns every proposal, where the classic list shows nothing until a month and
// year are sent). The range is applied by the server.
async function fetchProposalsFapi(range: SupplierProposalRange): Promise<SupplierProposalRow[]> {
  const items: any[] = []
  let pages = 1
  for (let page = 1; page <= pages && page <= 50; page += 1) {
    const d = await fapiGet<any>('/supplier_proposal/fapi/list.php', { page, limit: 100, date_from: range.from || undefined, date_to: range.to || undefined, sort: 'date', direction: 'desc' })
    pages = d.pages ?? 1
    items.push(...(d.items ?? []))
  }
  return items.map(rowFromFapi)
}

export function useSupplierProposals(range: SupplierProposalRange) {
  return useQuery({
    queryKey: ['supplier-proposals', 'list', range],
    queryFn: (): Promise<SupplierProposalRow[]> => fetchProposalsFapi(range),
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

// ── New price request (supplier_proposal/fapi/create.php) ───────────────────

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

// What form_options.php?socid resolved for a chosen vendor, with the step that produced each value.
export interface SupplierProposalDefaults {
  paymentTermsId: string
  paymentTypeId: string
  bankAccountId: string
  shippingMethodId: string
  resolvedFrom: Record<string, string>
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const SP_BASE = '/supplier_proposal/fapi'

function fapiChoices(list: any[] | undefined): SupplierProposalFormOption[] {
  return (list ?? []).map((o) => ({ value: String(o.value ?? o.id), label: String(o.label ?? o.name ?? o.value) }))
}

// supplier_proposal/fapi/form_options.php: suppliers, payment terms and modes, bank accounts, shipping methods, PDF
// templates, projects and currencies.
export function useSupplierProposalCreateForm() {
  return useQuery({
    queryKey: ['supplier-proposals', 'createForm'],
    queryFn: async (): Promise<SupplierProposalCreateFormData> => {
      const d = await fapiGet<any>(`${SP_BASE}/form_options.php`)
      return {
        vendors: fapiChoices(d.suppliers),
        paymentTerms: fapiChoices(d.payment_terms),
        paymentTypes: fapiChoices(d.payment_modes),
        bankAccounts: fapiChoices(d.bank_accounts),
        shippingMethods: fapiChoices(d.shipping_methods),
        templates: fapiChoices(d.models),
        projects: fapiChoices(d.projects),
        currencies: fapiChoices(d.currencies),
        defaultTemplate: String(d.default_model ?? d.defaults?.model ?? ''),
        defaultCurrency: String(d.defaults?.currency_code ?? ''),
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}

// form_options.php?socid=N: the defaults for that vendor (its own payment terms, mode and bank), so the
// form can pre-fill them and say where they came from. An unknown vendor, or a third-party that is not
// flagged as a supplier, answers an error (404 / 422), which the form simply ignores.
export function useSupplierProposalDefaults(socid: string) {
  return useQuery({
    queryKey: ['supplier-proposals', 'defaults', socid],
    queryFn: async (): Promise<SupplierProposalDefaults> => {
      const d = await fapiGet<any>(`${SP_BASE}/form_options.php`, { socid })
      const id = (v: unknown) => (v ? String(v) : '')
      return {
        paymentTermsId: id(d.defaults?.payment_term_id),
        paymentTypeId: id(d.defaults?.payment_mode_id),
        bankAccountId: id(d.defaults?.bank_account_id),
        shippingMethodId: id(d.defaults?.shipping_method_id),
        resolvedFrom: d.defaults_resolved_from ?? {},
      }
    },
    enabled: !!socid,
    staleTime: 1000 * 60,
    retry: false,
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

export function useCreateSupplierProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewSupplierProposalInput): Promise<string> => createViaFapi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-proposals'] })
    },
  })
}

// supplier_proposal/fapi/create.php: the header and its lines in one transaction; answers the new
// draft's id and its provisional (PROV…) reference.
async function createViaFapi(input: NewSupplierProposalInput): Promise<string> {
  const num = (v: string) => (v ? Number(v) : undefined)
  const d = await fapiPost<{ id: number }>(`${SP_BASE}/create.php`, {
    socid: Number(input.vendorId),
    payment_term_id: num(input.paymentTermsId),
    payment_mode_id: num(input.paymentTypeId),
    bank_account_id: num(input.bankAccountId),
    shipping_method_id: num(input.shippingMethodId),
    date_delivery: input.deliveryDate || undefined,
    model: input.template || undefined,
    project_id: num(input.projectId),
    currency_code: input.currency || undefined,
    lines: [],
  })
  return String(d.id)
}
