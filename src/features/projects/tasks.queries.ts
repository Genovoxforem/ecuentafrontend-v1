import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

// Real GET/POST/PUT/DELETE /api/project-tasks/ (api/project-tasks/index.php)
// — bridges to the real projet/class/task.class.php methods, same rationale
// as projects.queries.ts (see that file's header comment). Confirmed live
// end-to-end: create, list, update, add real time spent, delete.

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

export function useTasksList(projectId?: number) {
  return useQuery({
    queryKey: ['projects', 'tasks', 'list', projectId ?? 'all'],
    queryFn: async (): Promise<{ items: TaskRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: TaskRow[]; total: number }>>('/project-tasks/', { params: { projectId, limit: 500 } })
      return data.data
    },
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

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<NewTaskInput> & { id: number }) => {
      const { data } = await api.put<WebEnvelope<{ id: number }>>('/project-tasks/', input, { params: { id } })
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
