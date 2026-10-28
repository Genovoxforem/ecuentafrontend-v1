import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDdOrder, loadDdCandidates, loadDdOrderLines, loadDdRejects, loadDdRequests, loadDdSummary } from './directDebitFapi'

// Direct debit (compta/prelevement/fapi): the area and statistics share one summary answer.
export const useDdSummary = () => useQuery({ queryKey: ['banking', 'directDebit', 'summary'], queryFn: loadDdSummary, staleTime: 1000 * 30 })
export const useDdOrderLines = () => useQuery({ queryKey: ['banking', 'directDebit', 'orderLines'], queryFn: loadDdOrderLines, staleTime: 1000 * 30 })
export const useDdRequests = () => useQuery({ queryKey: ['banking', 'directDebit', 'requests'], queryFn: loadDdRequests, staleTime: 1000 * 30 })
export const useDdRejects = () => useQuery({ queryKey: ['banking', 'directDebit', 'rejects'], queryFn: loadDdRejects, staleTime: 1000 * 30 })
export const useDdCandidates = () => useQuery({ queryKey: ['banking', 'directDebit', 'candidates'], queryFn: loadDdCandidates, staleTime: 1000 * 30 })

// confirm=false only asks what would be created; confirm=true writes the order.
export function useCreateDdOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (confirm: boolean) => createDdOrder(confirm),
    onSuccess: (result) => {
      if (!result.dryRun) queryClient.invalidateQueries({ queryKey: ['banking', 'directDebit'] })
    },
  })
}
