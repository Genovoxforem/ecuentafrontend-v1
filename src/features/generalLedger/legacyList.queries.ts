import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError } from '../../shared/legacyHtmlFetch'
import { readAllLegacyTables, readLegacyTable, type LegacyTable } from './legacyTable'

// Reads any classic Dolibarr list page (see legacyTable.ts) with its own
// `limit` / `page` / `search_*` GET params.
//
// `hasHeader` pins the table when its first header cell is empty (a selection
// checkbox column), where `firstHeader` alone would match any such table.
//
// `load` replaces the page fetch for a list that now has a JSON endpoint: it gets the same params and returns the same LegacyTable, so
// the list page renders it unchanged.
export function useLegacyList(path: string, firstHeader: RegExp, params: Record<string, string>, hasHeader?: RegExp, load?: (params: Record<string, string>) => Promise<LegacyTable>) {
  return useQuery({
    queryKey: ['generalLedger', 'legacyList', path, firstHeader.source, hasHeader?.source, params, load ? 'fapi' : 'page'],
    queryFn: async (): Promise<LegacyTable> => {
      if (load) return load(params)
      const doc = await fetchLegacyDocument(path, new URLSearchParams(params))
      const table = hasHeader ? (readAllLegacyTables(doc, firstHeader, 1, hasHeader)[0] ?? null) : readLegacyTable(doc, firstHeader)
      if (!table) throw legacyMissingContentError(doc, 'The list on this backend page was not recognised.')
      return table
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
