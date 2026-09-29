import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseExpenseReportCard } from './expenseReportCardParser'

export function useExpenseReportCard(id: string | undefined) {
  return useQuery({
    queryKey: ['expenseReports', 'card', id],
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/expensereport/card.php', new URLSearchParams({ id: id ?? '' }))
      return parseExpenseReportCard(doc)
    },
    enabled: Boolean(id),
  })
}
