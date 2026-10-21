import { useQuery } from '@tanstack/react-query'
import { fetchSalesOverview, type SalesOverviewParams } from '../../api/invoices'

export function useSalesOverview(params: SalesOverviewParams) {
  return useQuery({
    queryKey: ['sales', 'overview', params],
    queryFn: () => fetchSalesOverview(params),
    staleTime: 1000 * 60,
  })
}
