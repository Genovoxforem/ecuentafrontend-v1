import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages } from '../../api/fapiRow'

// The task LIST is projet/fapi/tasks.php (fapi only). Create, delete and add-time-spent still call the old REST /api/project-tasks/
// (api/project-tasks/index.php), which answers 404 on newecuenta: they need fapi writers (master AN-100, report: Projects).

export interface TaskRow {
  id: number
  ref: string | null
  label: string
  projectId: number
  parentTaskId: number
  dateStart: string | null
  dateEnd: string | null
  plannedWorkload: number | null // seconds
  progress: number | null // percent
  projectRef?: string
  projectTitle?: string
  projectStatusCode?: number | null
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// projet/fapi/tasks.php: the task list as key-authenticated JSON (the old /api/project-tasks/ answers 404 on newecuenta).
// Tasks are limited to the projects the user may see. The item has no project status; dates are shown as the API prints them
// (a Unix timestamp becomes yyyy-mm-dd). The row shape is the one the API document gives: the project tables are empty on
// newecuenta, so no live row has been seen.
interface FapiTask {
  id: number
  ref?: string | null
  label: string
  project?: { id?: number; ref?: string; title?: string } | null
  parent_task_id?: number | null
  progress?: number | null
  planned_workload?: number | null
  date_start?: number | string | null
  date_end?: number | string | null
}
const taskDate = (v: number | string | null | undefined): string | null => (typeof v === 'number' ? new Date(v * 1000).toISOString().slice(0, 10) : v || null)

async function fetchTasksFapi(projectId?: number): Promise<{ items: TaskRow[]; total: number }> {
  const rows = await fetchAllPages<FapiTask>((page) => fapiGet<{ items?: FapiTask[]; pagination?: { pages?: number } }>('/projet/fapi/tasks.php', { project: projectId, limit: 100, page }))
  const items = rows.map(
    (t): TaskRow => ({
      id: t.id,
      ref: t.ref ?? null,
      label: t.label,
      projectId: t.project?.id ?? 0,
      parentTaskId: t.parent_task_id ?? 0,
      dateStart: taskDate(t.date_start),
      dateEnd: taskDate(t.date_end),
      plannedWorkload: t.planned_workload ?? null,
      progress: t.progress ?? null,
      projectRef: t.project?.ref,
      projectTitle: t.project?.title,
    }),
  )
  return { items, total: items.length }
}

export function useTasksList(projectId?: number) {
  return useQuery({
    queryKey: ['projects', 'tasks', 'list', projectId ?? 'all'],
    queryFn: () => fetchTasksFapi(projectId),
    staleTime: 1000 * 30,
  })
}

export interface NewTaskInput {
  projectId: number
  parentTaskId?: number
  ref?: string
  label: string
  description?: string
  dateStart?: string // yyyy-mm-dd
  dateEnd?: string // yyyy-mm-dd
  plannedWorkloadSeconds?: number
  progress?: number
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewTaskInput) => {
      const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/project-tasks/', input)
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'tasks'] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<WebEnvelope<{ id: number }>>('/project-tasks/', { params: { id } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'tasks'] }),
  })
}

// Real Task::addTimeSpent() — durationSeconds matches Dolibarr's own real
// convention for this field (3600 = 1h).
export function useAddTimeSpent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: number; date: string; durationSeconds: number; note?: string }) => {
      const { data } = await api.post<WebEnvelope<{ id: number }>>('/project-tasks/', input, { params: { id, action: 'addtimespent' } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'tasks'] }),
  })
}
