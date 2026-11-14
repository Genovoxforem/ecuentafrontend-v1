import { useQuery } from '@tanstack/react-query'
import { loadProjectStats, type StatsView } from './projectStatsApi.data'

// Project statistics on projet/fapi/stats.php (projectStatsApi.data.ts) instead of the classic projet/stats/index.php.
export type ProjectStats = StatsView

export function useProjectStats(year?: string, socid?: string) {
  return useQuery({
    queryKey: ['projects', 'stats', year ?? '', socid ?? ''],
    queryFn: (): Promise<ProjectStats> => loadProjectStats(year, socid),
    staleTime: 1000 * 30,
    retry: false,
  })
}
