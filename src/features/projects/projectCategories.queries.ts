import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// Project tags (Categorie::TYPE_PROJECT = 6) on categories/fapi (13 Nov 2026: the type `project` is served by list.php and create.php like the other
// four). list.php?type=project -> {type, type_id: 6, type_label: "Project tags", tree [], flat [], total, ...}; newecuenta has no project tag, so a row is read as
// the other tag types' rows are (id, label, description, color, parent_id, count, children). create.php body {type, label, description, color (no #), parent_id,
// visible}; 409 for a duplicate name at the same level.
export interface ProjectCategoryRow {
  id: number
  label: string
  color: string | null
  dateCreation: string | null
}

interface Tag {
  id: number
  label: string
  color?: string
  children?: Tag[]
}

async function loadTree(): Promise<Tag[]> {
  const d = await fapiGet<{ tree: Tag[] }>('/categories/fapi/list.php', { type: 'project' })
  return d.tree ?? []
}

function flatten(nodes: Tag[], path = ''): Array<{ id: number; label: string; full: string; color: string | null }> {
  return nodes.flatMap((n) => {
    const full = path ? `${path} >> ${n.label}` : n.label
    return [{ id: n.id, label: n.label, full, color: n.color || null }, ...flatten(n.children ?? [], full)]
  })
}

export function useProjectCategoriesList() {
  return useQuery({
    queryKey: ['projects', 'categories', 'list'],
    queryFn: async (): Promise<ProjectCategoryRow[]> => flatten(await loadTree()).map((t) => ({ id: t.id, label: t.full, color: t.color, dateCreation: null })),
    staleTime: 1000 * 30,
  })
}

export interface ProjectCategoryFormContext {
  token: string
  parentOptions: { value: string; label: string }[]
}

// the "Add in" select: every project tag, by its full label
export function useProjectCategoryCreateForm() {
  return useQuery({
    queryKey: ['projects', 'categories', 'createForm'],
    queryFn: async (): Promise<ProjectCategoryFormContext> => ({ token: '', parentOptions: flatten(await loadTree()).map((t) => ({ value: String(t.id), label: t.full })) }),
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useCreateProjectCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; description: string; color: string; parent: string }) => {
      const parent = Number(input.parent)
      await fapiPost('/categories/fapi/create.php', {
        type: 'project',
        label: input.label,
        description: input.description,
        color: input.color.replace('#', ''),
        parent_id: parent > 0 ? parent : 0,
        visible: true,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'categories'] }),
  })
}
