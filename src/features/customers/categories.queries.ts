import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

// 1=vendor/supplier (Categorie::TYPE_SUPPLIER), 2=customer, 4=contact.
export type CategoryType = 1 | 2 | 4

export interface CategoryRow {
  id: number
  label: string
  description: string | null
  color: string | null
  parentId: number
  itemCount: number
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET/POST /api/categories/ (api/categories/index.php) — real, reads/writes
// llx_categorie. type mirrors Dolibarr's Categorie::TYPE_SUPPLIER=1 /
// TYPE_CUSTOMER=2 / TYPE_CONTACT=4, matching how the legacy page is reached
// via categories/index.php?type=1|2|4. The backend's own item-count join
// already treats type=1 the same as type=2 (both link via
// llx_categorie_societe/fk_soc — Dolibarr shares one junction table across
// customer and vendor company categories), confirmed live.
export function useCategories(type: CategoryType, search = '') {
  return useQuery({
    queryKey: ['categories', type, search],
    queryFn: async (): Promise<{ items: CategoryRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: CategoryRow[]; total: number }>>('/categories/', { params: { type, search: search || undefined } })
      return data.data
    },
  })
}

export function useCreateCategory(type: CategoryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; description?: string }) => {
      const { data } = await api.post<WebEnvelope<{ id: number }>>('/categories/', { type, ...input })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', type] }),
  })
}
