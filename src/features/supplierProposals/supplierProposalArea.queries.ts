import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

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

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/supplier-proposals/summary/ (api/supplier-proposals/summary/index.php)
// — real, reads llx_supplier_proposal directly (status counts using
// SupplierProposal's own real status constants, confirmed against the
// class source — see that endpoint's header comment).
export function useSupplierProposalAreaSummary() {
  return useQuery({
    queryKey: ['supplier-proposals', 'summary'],
    queryFn: async (): Promise<SupplierProposalAreaSummary> => {
      const { data } = await api.get<WebEnvelope<SupplierProposalAreaSummary>>('/supplier-proposals/summary/')
      return data.data
    },
  })
}
