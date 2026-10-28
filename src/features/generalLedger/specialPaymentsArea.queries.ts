import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { loadSpecialPaymentsArea } from './specialPaymentsAreaFapi'

// compta/charges/fapi/dashboard.php?year= — all special payments made in one year.
export function useSpecialPaymentsArea(year: number) {
  return useQuery({
    queryKey: ['generalLedger', 'specialPaymentsArea', year],
    queryFn: ({ signal }) => loadSpecialPaymentsArea(year, signal),
    placeholderData: keepPreviousData,
  })
}
