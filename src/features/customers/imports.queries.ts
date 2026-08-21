import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseImportDatasets, looksLikeLegacyLoginPage, type ImportDataset } from './importsHtmlParser'

// No REST API exists for the generic import wizard (Sales > Settings >
// Import Customers/Vendors) — reads the real Step 1 page directly and
// parses its real dataset rows + their real `datatoimport` codes (see
// importsHtmlParser.ts), same client-side-scrape pattern as Ledger/
// Warehouse stats.
export function useImportDatasets() {
  return useQuery({
    queryKey: ['imports', 'datasets'],
    queryFn: async (): Promise<ImportDataset[]> => {
      const doc = await fetchLegacyDocument('/imports/import.php')
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseImportDatasets(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
