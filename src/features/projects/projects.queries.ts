import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

// Real GET/POST/PUT/DELETE /api/projects/ (api/projects/index.php) — unlike
// almost every other module in this app, Projects genuinely has a real
// backend surface: Dolibarr's stock Restler REST layer
// (projet/class/api_projects.class.php) already implements full CRUD on
// the real Project class, just gated behind a different secret (DOLAPIKEY)
// this app's own login never exposes to the browser. api/projects/index.php
// bridges that gap — same X-API-Key auth as every other endpoint in this
// app, same real Project::create/update/delete/setValid/createFromClone()
// methods the Restler layer itself calls. Confirmed live end-to-end
// (list/get/create/update/validate/clone/delete) — see that file's header
// comment for the full rationale and the real projet/list.php filter
// semantics status/leadFilter mirror.

export type ProjectListFilter = 'all' | 'openLeads' | 'openProjects'

export interface ProjectRow {
  id: number
  ref: string
  title: string
  description: string
  thirdPartyId: number | null
  thirdPartyName: string | null
  statusCode: number
  statusLabel: 'Draft' | 'Open' | 'Closed' | 'Unknown'
  public: boolean
  dateStart: string | null
  dateEnd: string | null
  budgetAmount: number | null
  oppStatusId: number | null
  oppPercent: number | null
  oppAmount: number | null
  usageOpportunity: boolean
  usageTask: boolean
  usageBillTime: boolean
  dateCreation: string | null
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

function filterParams(filter: ProjectListFilter) {
  if (filter === 'openLeads') return { status: 'open', leadFilter: 'openLeads' }
  if (filter === 'openProjects') return { status: 'open', leadFilter: 'openProjects' }
  return { status: 'all' }
}

export function useProjectsList(filter: ProjectListFilter) {
  return useQuery({
    queryKey: ['projects', 'list', filter],
    queryFn: async (): Promise<{ items: ProjectRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: ProjectRow[]; total: number }>>('/projects/', { params: { ...filterParams(filter), limit: 500 } })
      return data.data
    },
    staleTime: 1000 * 30,
  })
}

export function useProjectDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: async (): Promise<{ project: ProjectRow; linkedObjectCounts: Record<string, number> }> => {
      const { data } = await api.get<WebEnvelope<{ project: ProjectRow; linkedObjectCounts: Record<string, number> }>>('/projects/', { params: { id } })
      return data.data
    },
    enabled: Boolean(id),
  })
}

export interface NewProjectInput {
  ref?: string
  title: string
  description?: string
  thirdPartyId?: string
  public?: boolean
  dateStart?: string // yyyy-mm-dd
  dateEnd?: string // yyyy-mm-dd
  budgetAmount?: string
  oppStatusId?: string
  oppPercent?: string
  oppAmount?: string
  usageOpportunity?: boolean
  usageTask?: boolean
  usageBillTime?: boolean
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewProjectInput) => {
      const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/projects/', input)
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<NewProjectInput> & { id: number }) => {
      const { data } = await api.put<WebEnvelope<{ id: number }>>('/projects/', input, { params: { id } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<WebEnvelope<{ id: number }>>('/projects/', { params: { id } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

// Real Project::setValid() — moves a Draft project to Open.
export function useValidateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<WebEnvelope<{ id: number; statusCode: number }>>('/projects/', {}, { params: { id, action: 'validate' } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

// Real Project::createFromClone() — a genuine backend capability that
// exists but isn't exposed even by the stock Restler API; see
// api/projects/index.php's own comment. Clones contacts + tasks by
// default, matching the legacy card.php clone form's own defaults.
export function useCloneProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/projects/', {}, { params: { id, action: 'clone' } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
