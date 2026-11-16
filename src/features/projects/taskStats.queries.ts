import { useQuery } from '@tanstack/react-query'
import { loadTaskStats } from './projectStatsApi.data'
import type { ProjectStats } from './projectStats.queries'

// Task statistics on projet/fapi/task_stats.php (projectStatsApi.data.ts) instead of the classic projet/tasks/stats/index.php.
export function useTaskStats(year?: string) {
  return useQuery({
    queryKey: ['projects', 'task-stats', year ?? ''],
    queryFn: (): Promise<ProjectStats> => loadTaskStats(year),
    staleTime: 1000 * 30,
    retry: false,
  })
}
