import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// compta/bank/various_payment/fapi/payment.php: one payment (GET ?id=) and its delete. Update is not used: the classic card has no Modify.
export interface VariousPayment {
  id: number
  ref: string | number
  label: string
  note: string | null
  date_payment: string | null
  date_value: string | null
  sens: number
  sens_label: string
  amount: number
  payment_type_id: number | null
  num_payment: string | null
  accountancy_code: string | null
  subledger_account: string | null
  fk_project: number | null
  fk_bank: number | null
  fk_account: number | null
  bank_account: { id: number; ref: string; label: string } | null
  rappro: number
  already_accounted: number | boolean
}

export function useVariousPayment(id: string | undefined) {
  return useQuery({
    queryKey: ['ledger', 'various-payment', id],
    queryFn: ({ signal }) => fapiGet<VariousPayment>('/compta/bank/various_payment/fapi/payment.php', { id }, signal),
    enabled: !!id,
  })
}

export function useDeleteVariousPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => fapiPost<{ id: number; deleted: boolean }>('/compta/bank/various_payment/fapi/payment.php', { id }, { action: 'delete' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['legacy-list'] })
    },
  })
}
