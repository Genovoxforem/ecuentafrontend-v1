import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseVatReportByMonth } from './vatReportByMonthParser'

export function useVatReportByMonth() {
  return useQuery({
    queryKey: ['generalLedger', 'vatReportByMonth'],
    queryFn: async () => parseVatReportByMonth(await fetchLegacyDocument('/compta/tva/index.php')),
  })
}
