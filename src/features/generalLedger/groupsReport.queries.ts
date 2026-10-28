import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ReportTable } from './legacyTable'
import { loadGroupsReport } from './reportsFapi'

// compta/resultat/fapi/groups.php?mode=predefined | personalized — the result by account groups for a date range (ISO start / end),
// on the ledger basis (the only one the endpoint accepts for predefined groups). `path` still says which report the page is: the
// personalized one is the classic result.php, the predefined one clientfourn.php.
export function useGroupsReport(path: string, _firstHeader: RegExp, start: string, end: string) {
  const mode = /result\.php/.test(path) ? 'personalized' : 'predefined'
  return useQuery({
    queryKey: ['generalLedger', 'groupsReport', mode, start, end],
    queryFn: (): Promise<ReportTable> => loadGroupsReport(mode, start, end),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
