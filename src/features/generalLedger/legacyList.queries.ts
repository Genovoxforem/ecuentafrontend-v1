import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError } from '../../shared/legacyHtmlFetch'
import { readAllLegacyTables, readLegacyTable, type LegacyTable } from './legacyTable'

// Reads any classic Dolibarr list page (see legacyTable.ts) with its own
// `limit` / `page` / `search_*` GET params.
//
// `hasHeader` pins the table when its first header cell is empty (a selection
// checkbox column), where `firstHeader` alone would match any such table.
export function useLegacyList(path: string, firstHeader: RegExp, params: Record<string, string>, hasHeader?: RegExp) {
  return useQuery({
    queryKey: ['generalLedger', 'legacyList', path, firstHeader.source, hasHeader?.source, params],
    queryFn: async (): Promise<LegacyTable> => {
      const doc = await fetchLegacyDocument(path, new URLSearchParams(params))
      const table = hasHeader ? (readAllLegacyTables(doc, firstHeader, 1, hasHeader)[0] ?? null) : readLegacyTable(doc, firstHeader)
      if (!table) throw legacyMissingContentError(doc, 'The list on this backend page was not recognised.')
      return table
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

// Same, for pages that print several tables under the same header (dashboards).
export function useLegacyTables(path: string, firstHeader: RegExp, params: Record<string, string>, hasHeader?: RegExp) {
  return useQuery({
    queryKey: ['generalLedger', 'legacyTables', path, firstHeader.source, hasHeader?.source, params],
    queryFn: async (): Promise<LegacyTable[]> => {
      const doc = await fetchLegacyDocument(path, new URLSearchParams(params))
      const tables = readAllLegacyTables(doc, firstHeader, Infinity, hasHeader)
      if (tables.length === 0) throw legacyMissingContentError(doc, 'The tables on this backend page were not recognised.')
      return tables
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
