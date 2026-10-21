/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

export interface LatestProposal {
  id: number
  ref: string
  thirdParty: string | null
  lastModified: string
}

export interface SupplierProposalAreaSummary {
  statusCounts: { draft: number; validated: number; signed: number; notSigned: number; closed: number }
  latest: LatestProposal[]
  total: number
}

// supplier_proposal/fapi/list.php: the summary (counts by status, total) and the five most recent proposals in
// one call.
export function useSupplierProposalAreaSummary() {
  return useQuery({
    queryKey: ['supplier-proposals', 'summary'],
    queryFn: async (): Promise<SupplierProposalAreaSummary> => {
      const d = await fapiGet<any>('/supplier_proposal/fapi/list.php', { limit: 5, sort: 'date', direction: 'desc' })
      const sm = d.summary ?? {}
      return {
        statusCounts: { draft: Number(sm.draft) || 0, validated: Number(sm.validated) || 0, signed: Number(sm.signed) || 0, notSigned: Number(sm.not_signed) || 0, closed: Number(sm.closed) || 0 },
        latest: (d.items ?? []).map((p: any) => ({ id: Number(p.id), ref: p.ref ?? '', thirdParty: p.supplier?.name ?? null, lastModified: String(p.date_valid ?? p.date_creation ?? p.date ?? '') })),
        total: Number(sm.total) || 0,
      }
    },
  })
}
