import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'

// 1=vendor/supplier (Categorie::TYPE_SUPPLIER), 2=customer, 4=contact.
export type CategoryType = 1 | 2 | 4

export interface CategoryRow {
  id: number
  label: string
  fullLabel: string
  description: string | null
  color: string | null
  parentId: number
  itemCount: number
}

// The classic tags/categories page (categories/index.php?type=customer|contact|
// supplier) loads its tree from categories/api/index.php — confirmed live on
// 172.16.5.10 (session-cookie auth, read-only: actions tree / search /
// products). The names below are that page's own `type` values.
const TYPE_NAME: Record<CategoryType, 'supplier' | 'customer' | 'contact'> = { 1: 'supplier', 2: 'customer', 4: 'contact' }

interface TreeResponse {
  success: boolean
  error?: string
  categories?: { id: number; fk_parent: number; label: string; fulllabel?: string; description?: string; color?: string | null; count?: number }[]
  stats?: { total?: number; roots?: number; linked?: number; created_this_month?: number }
}

// The four cards above the tree: how many tags, how many top-level ones, how
// many records are tagged and how many tags were created this month.
export interface CategoryStats {
  total: number
  roots: number
  linked: number
  createdThisMonth: number
}

// GET categories/api/index.php?action=tree&type=… — replaces GET
// /api/categories/, which does not exist on the backend (404). The whole tree
// comes back in one response; the name filter runs client-side, and rows are
// ordered so children follow their parent.
export function useCategories(type: CategoryType, search = '') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: async (): Promise<{ items: CategoryRow[]; total: number; stats: CategoryStats }> => {
      const { data } = await axios.get<TreeResponse>('/categories/api/index.php', { params: { action: 'tree', type: TYPE_NAME[type] } })
      if (!data.success) throw new Error(data.error ?? 'Could not load tags/categories.')
      const items = (data.categories ?? []).map(
        (c): CategoryRow => ({
          id: c.id,
          label: c.label,
          fullLabel: c.fulllabel || c.label,
          description: c.description || null,
          color: c.color || null,
          parentId: c.fk_parent || 0,
          itemCount: c.count ?? 0,
        }),
      )
      const stats: CategoryStats = {
        total: data.stats?.total ?? items.length,
        roots: data.stats?.roots ?? items.filter((c) => !c.parentId).length,
        linked: data.stats?.linked ?? items.reduce((sum, c) => sum + c.itemCount, 0),
        createdThisMonth: data.stats?.created_this_month ?? 0,
      }
      return { items, total: items.length, stats }
    },
    select: (d) => {
      const q = search.trim().toLowerCase()
      const items = q ? d.items.filter((c) => c.fullLabel.toLowerCase().includes(q)) : d.items
      return { items, total: items.length, stats: d.stats }
    },
  })
}

// A record filed under a tag (a customer or a contact). `href` is the card
// URL the backend printed for it — resolve it with resolveLegacyRoute, never
// link to it directly.
export interface CategoryLinkedItem {
  id: number
  ref: string
  label: string
  href: string | null
}

interface ProductsResponse {
  success: boolean
  error?: string
  categories?: Record<string, { id: number; label: string; products?: { id: number; ref?: string; label?: string; link_html?: string }[] }>
}

function toLinkedItem(p: { id: number; ref?: string; label?: string; link_html?: string }): CategoryLinkedItem {
  const href = new DOMParser().parseFromString(p.link_html ?? '', 'text/html').querySelector('a')?.getAttribute('href') ?? null
  return { id: p.id, ref: p.ref ?? '', label: p.label ?? '', href }
}

// GET categories/api/index.php?action=products&type=…[&category_id=…] — the
// records filed under one tag, or under every tag when no id is given (the
// classic page's "Expand products" button). Keyed by tag id.
export async function fetchCategoryItems(type: CategoryType, categoryId?: number): Promise<Record<number, CategoryLinkedItem[]>> {
  const { data } = await axios.get<ProductsResponse>('/categories/api/index.php', {
    params: { action: 'products', type: TYPE_NAME[type], ...(categoryId ? { category_id: categoryId } : {}) },
  })
  if (!data.success) throw new Error(data.error ?? 'Could not load the tagged items.')
  const out: Record<number, CategoryLinkedItem[]> = {}
  for (const [id, cat] of Object.entries(data.categories ?? {})) out[Number(id)] = (cat.products ?? []).map(toLinkedItem)
  return out
}

// POST categories/api/index.php action=create — the JSON create the classic
// tags page's own "new tag" modal uses: label, description, color (hex, stored
// without the #, as the classic form saves it) and fk_parent (0 = top level).
export function useCreateCategory(type: CategoryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; description?: string; color?: string; parentId?: number }) => {
      const body = new URLSearchParams({
        action: 'create',
        type: TYPE_NAME[type],
        label: input.label,
        description: input.description ?? '',
        color: (input.color ?? '').replace('#', ''),
        fk_parent: String(input.parentId && input.parentId > 0 ? input.parentId : 0),
      })
      const res = await fetch('/categories/api/index.php', { method: 'POST', credentials: 'same-origin', body })
      const json = await parseLegacyJson<{ success: boolean; error?: string }>(res)
      if (!json.success) throw new Error(json.error || `Could not create the tag (backend returned ${res.status}).`)
      return { ok: true }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', type] }),
  })
}
