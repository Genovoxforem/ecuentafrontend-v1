import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { loadVatByCustomer } from './vatReportsFapi'

// compta/tva/fapi/report_by_customer.php — a read-only report.
export interface VatByCustomerFilters {
  // yyyy-mm-dd; empty = the backend's own default period
  dateStart: string
  dateEnd: string
  min: string
}

export function useVatByCustomer(filters: VatByCustomerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'vatByCustomer', 'fapi', filters],
    queryFn: () => loadVatByCustomer(filters),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
