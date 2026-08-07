import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'

export interface QuotationRow {
  ref: string
  refCustomer: string
  projectRef: string
  thirdParty: string
  city: string
  zipCode: string
  date: string
  endDate: string
  amountExclTax: number
  author: string
  salesRep: string
  status: string
}

export interface QuotationsSummary {
  totalProposals: number
  proposalsThisMonth: number
  totalProposalAmount: number
  validatedCount: number
  draftCount: number
  quotations: QuotationRow[]
}

const SEED: QuotationsSummary = {
  totalProposals: 0,
  proposalsThisMonth: 0,
  totalProposalAmount: 0,
  validatedCount: 0,
  draftCount: 0,
  quotations: [],
}

const KEY = ['local', 'quotations'] as const

// No backend endpoint exists for quotations/proposals on this app's server
// (confirmed: comm/propal/list has no equivalent route). Held in
// react-query's cache only — see shared/localCollection.ts — so creating
// one here feels real in the browser but never persists anywhere.
export function useQuotationsSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

export interface NewQuotationInput {
  thirdParty: string
  refCustomer?: string
  date: string
  endDate?: string
  amountExclTax: number
  author: string
}

export function useCreateQuotation() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  return (input: NewQuotationInput) => {
    const row: QuotationRow = {
      ref: nextLocalRef('(PROV-PR)'),
      refCustomer: input.refCustomer ?? '',
      projectRef: '',
      thirdParty: input.thirdParty,
      city: '',
      zipCode: '',
      date: input.date || todayIso(),
      endDate: input.endDate ?? '',
      amountExclTax: input.amountExclTax,
      author: input.author,
      salesRep: input.author,
      status: 'Draft',
    }
    update((current) => ({
      ...current,
      totalProposals: current.totalProposals + 1,
      proposalsThisMonth: current.proposalsThisMonth + 1,
      totalProposalAmount: current.totalProposalAmount + input.amountExclTax,
      draftCount: current.draftCount + 1,
      quotations: [row, ...current.quotations],
    }))
    logActivity({ label: `New quotation ${row.ref} for ${row.thirdParty}`, category: 'other', authorName: input.author })
  }
}
