import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'

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

// The classic "New tag/category" form (categories/card.php?action=create&type=…)
// — read for its fresh CSRF token, then posted the way the page itself does:
// token, action=add, addcat, type, type_id, label, description, color, parent
// (-1 = no parent). A successful add redirects to categories/index.php; a
// refusal re-renders the form with a showToast(…, "error") message.
export function useCreateCategory(type: CategoryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; description?: string; color?: string; parentId?: number }) => {
      const name = TYPE_NAME[type]
      const doc = await fetchLegacyDocument('/categories/card.php', new URLSearchParams({ action: 'create', type: name, type_id: String(type) }))
      const token = doc.querySelector<HTMLInputElement>('form input[name="action"][value="add"]')?.form?.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
      if (!token) throw new Error('Could not open the new tag form.')
      const body = new URLSearchParams({
        token,
        action: 'add',
        addcat: 'addcat',
        id: '',
        type: name,
        type_id: String(type),
        backtopage: '',
        urlfrom: '',
        label: input.label,
        description: input.description ?? '',
        color: (input.color ?? '').replace('#', ''),
        parent: String(input.parentId ?? -1),
      })
      const res = await fetch(`/categories/card.php?type=${name}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const err = toastMessages(html).find((m) => m.type === 'error')
      if (err) throw new Error(err.message)
      return { ok: true }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', type] }),
  })
}
