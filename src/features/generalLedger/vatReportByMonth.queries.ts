import { useQuery } from '@tanstack/react-query'
import { loadVatByMonth } from './vatReportsFapi'

// compta/tva/fapi/report_by_month.php — the tax collected and paid month by month for the year.
export function useVatReportByMonth() {
  return useQuery({
    queryKey: ['generalLedger', 'vatReportByMonth', 'fapi'],
    queryFn: loadVatByMonth,
  })
}
