import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCustomerRebate, deleteCustomerAbsoluteDiscount, fetchCustomerDiscounts, fetchCustomerRebates, setCustomerRelativeDiscount } from '../../api/customers'

export type RebateStatus = 'available' | 'consumed' | 'all'

// A customer's absolute discounts (societe/fapi/rebates.php), with the
// available / consumed totals the classic discount screen shows.
export function useCustomerRebates(socid: string | undefined, status: RebateStatus) {
  return useQuery({
    queryKey: ['customers', 'rebates', socid, status],
    queryFn: () => fetchCustomerRebates({ socid: Number(socid), status, limit: 200 }),
    enabled: !!socid,
    staleTime: 1000 * 30,
  })
}

export function useCreateCustomerRebate(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { amountHt: number; vatRate: number; description: string }) => {
      if (!socid) throw new Error('Missing customer id.')
      return createCustomerRebate({ socid: Number(socid), amount_ht: input.amountHt, tva_tx: input.vatRate, description: input.description })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'rebates', socid] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// societe/fapi/discounts.php: the standing percentage, and the permission to change discounts.
export function useCustomerDiscounts(socid: string | undefined) {
  return useQuery({ queryKey: ['customers', 'discounts', socid], queryFn: () => fetchCustomerDiscounts(Number(socid)), enabled: !!socid, staleTime: 1000 * 30 })
}

export function useSetRelativeDiscount(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { percent: number; note?: string }) => {
      if (!socid) throw new Error('Missing customer id.')
      return setCustomerRelativeDiscount({ socid: Number(socid), ...input })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'discounts', socid] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCustomerDiscount(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => {
      if (!socid) throw new Error('Missing customer id.')
      return deleteCustomerAbsoluteDiscount({ socid: Number(socid), id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'rebates', socid] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'discounts', socid] })
    },
  })
}
