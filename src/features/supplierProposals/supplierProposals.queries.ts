import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'

export interface SupplierProposalRow {
  ref: string
  thirdParty: string
  validationDate: string
  plannedDelivery: string
  amountExclTax: number
  amountInclTax: number
  author: string
  status: string
}

export interface SupplierProposalsSummary {
  totalProposals: number
  proposalsThisMonth: number
  totalProposalAmount: number
  validatedCount: number
  draftCount: number
  proposals: SupplierProposalRow[]
}

const SEED: SupplierProposalsSummary = {
  totalProposals: 0,
  proposalsThisMonth: 0,
  totalProposalAmount: 0,
  validatedCount: 0,
  draftCount: 0,
  proposals: [],
}

const KEY = ['local', 'supplierProposals'] as const

// No backend endpoint exists for supplier proposals on this app's server
// (confirmed: supplier_proposal/list has no equivalent route). Held in
// react-query's cache only — see shared/localCollection.ts — so creating
// one here feels real in the browser but never persists anywhere.
export function useSupplierProposalsSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

export interface NewSupplierProposalInput {
  thirdParty: string
  plannedDelivery?: string
  amountExclTax: number
  author: string
}

// No VAT-rate input on this quick form — inclusive amount mirrors the
// exclusive one until real line items with tax rates exist.
export function useCreateSupplierProposal() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  return (input: NewSupplierProposalInput) => {
    const row: SupplierProposalRow = {
      ref: nextLocalRef('(PROV-SUP)'),
      thirdParty: input.thirdParty,
      validationDate: todayIso(),
      plannedDelivery: input.plannedDelivery ?? '',
      amountExclTax: input.amountExclTax,
      amountInclTax: input.amountExclTax,
      author: input.author,
      status: 'Draft',
    }
    update((current) => ({
      ...current,
      totalProposals: current.totalProposals + 1,
      proposalsThisMonth: current.proposalsThisMonth + 1,
      totalProposalAmount: current.totalProposalAmount + input.amountExclTax,
      draftCount: current.draftCount + 1,
      proposals: [row, ...current.proposals],
    }))
    logActivity({ label: `New price request ${row.ref} to ${row.thirdParty}`, category: 'purchase', authorName: input.author })
  }
}
