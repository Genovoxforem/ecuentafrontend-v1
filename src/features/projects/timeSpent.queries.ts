import { useQuery } from '@tanstack/react-query'
import type { TimeSpentMode } from './timeSpentGrid.data'
import { loadTimeSpentSummary } from './projectStatsApi.data'

// Time Spent. The grids (Input per month / week / day) are read in timeSpentGrid.data.ts from userprofile/fapi/time_spent.php; the classic
// projet/activity/per{month,week,day}.php pages and their HTML reader are gone.

// The year's hours by month or week from projet/fapi/time_spent.php (the day tab has no such summary).
export function useTimeSpentSummary(mode: TimeSpentMode, year: number) {
  return useQuery({
    queryKey: ['projects', 'timeSpentSummary', mode, year],
    queryFn: () => loadTimeSpentSummary(mode === 'week' ? 'week' : 'month', year),
    enabled: mode !== 'day',
    staleTime: 1000 * 30,
    retry: false,
  })
}
