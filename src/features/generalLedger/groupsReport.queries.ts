import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { readReportTable, type ReportTable } from './legacyTable'

// compta/resultat/clientfourn.php ("By predefined groups") and result.php
// ("By personalized groups") — one report table each, for a date range sent as
// the page's own date_start/date_end day, month and year parameters. Confirmed
// live: an explicit full-year range returns exactly what the page shows by
// default; a range without movements prints "No record found" and zero totals.
// The page ignores the other accounting bases, so the ledger basis is fixed.
export function useGroupsReport(path: string, firstHeader: RegExp, start: string, end: string) {
  return useQuery({
    queryKey: ['generalLedger', 'groupsReport', path, start, end],
    queryFn: async (): Promise<ReportTable> => {
      const [sy, sm, sd] = start.split('-')
      const [ey, em, ed] = end.split('-')
      const params = new URLSearchParams({
        modecompta: 'BOOKKEEPING',
        date_startday: sd,
        date_startmonth: sm,
        date_startyear: sy,
        date_endday: ed,
        date_endmonth: em,
        date_endyear: ey,
      })
      const table = readReportTable(await fetchLegacyDocument(path, params), firstHeader)
      if (!table) throw new Error('The report table was not found on the backend page.')
      return table
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
