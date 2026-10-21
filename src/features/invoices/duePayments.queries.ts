import { useQuery } from '@tanstack/react-query'
import { fetchDuePayments } from '../../api/payments'

export function useDuePayments(params: { date?: string; overdueOnly?: boolean }) {
  return useQuery({
    queryKey: ['invoices', 'due-payments', params.date ?? '', !!params.overdueOnly],
    queryFn: () => fetchDuePayments({ date: params.date || undefined, overdue_only: params.overdueOnly }),
    staleTime: 1000 * 30,
  })
}
