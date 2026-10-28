import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProductCategory, getProductCategory, updateProductCategory } from '../../api/products'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { ROUTES } from '../../routes'

// 0=product/service (Categorie::TYPE_PRODUCT), 1=vendor/supplier
// (Categorie::TYPE_SUPPLIER), 2=customer, 4=contact.
export type CategoryType = 0 | 1 | 2 | 4

export interface CategoryRow {
  id: number
  label: string
  fullLabel: string
  description: string | null
  color: string | null
  parentId: number
  itemCount: number
}

// The classic tags/categories page (categories/index.php?type=product|customer|
// contact|supplier) loads its tree from categories/api/index.php (session-cookie
// auth, read-only: actions tree / search / products). The names below are that
// page's own `type` values.
const TYPE_NAME: Record<CategoryType, 'product' | 'supplier' | 'customer' | 'contact'> = { 0: 'product', 1: 'supplier', 2: 'customer', 4: 'contact' }

// The four cards above the tree: how many tags, how many top-level ones, how
// many records are tagged and how many tags were created this month.
export interface CategoryStats {
  total: number
  roots: number
  linked: number
  createdThisMonth: number
}

const FAPI = '/categories/fapi'

interface FapiTag {
  id: number
  label: string
  description?: string
  color?: string
  parent_id: number
  count: number
  children?: FapiTag[]
}

// categories/fapi/list.php?type=…: the tree (children nested, a count per tag). The full labels are built here
// and the rows are ordered parent-first like the classic tree.
async function fetchTreeFapi(type: CategoryType) {
  const d = await fapiGet<{ tree: FapiTag[] }>(`${FAPI}/list.php`, { type: TYPE_NAME[type] })
  const items: CategoryRow[] = []
  const walk = (nodes: FapiTag[], path: string) => {
    for (const n of nodes) {
      const full = path ? `${path} >> ${n.label}` : n.label
      items.push({ id: n.id, label: n.label, fullLabel: full, description: n.description || null, color: n.color || null, parentId: n.parent_id || 0, itemCount: n.count ?? 0 })
      walk(n.children ?? [], full)
    }
  }
  walk(d.tree ?? [], '')
  const stats: CategoryStats = { total: items.length, roots: items.filter((c) => !c.parentId).length, linked: items.reduce((sum, c) => sum + c.itemCount, 0), createdThisMonth: 0 }
  return { items, total: items.length, stats }
}

// categories/fapi/list.php: the whole tree comes back in one response; the name filter runs client-side.
export function useCategories(type: CategoryType, search = '') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => fetchTreeFapi(type),
    select: (d) => {
      const q = search.trim().toLowerCase()
      const items = q ? d.items.filter((c) => c.fullLabel.toLowerCase().includes(q)) : d.items
      return { items, total: items.length, stats: d.stats }
    },
  })
}

// A record filed under a tag (a customer, a vendor, a contact or a product), with the in-app route built from the
// API's route key and id.
export interface CategoryLinkedItem {
  id: number
  ref: string
  label: string
  to: string | null
}

// A route key and an id from the API ("customers/42") → the React page.
function routeFromUrlPath(urlPath: string | undefined): string | null {
  const m = (urlPath ?? '').match(/^([a-z_]+)\/(\d+)/)
  if (!m) return null
  if (m[1] === 'customers') return ROUTES.customerDetail.replace(':id', m[2])
  if (m[1] === 'vendors') return `${ROUTES.customerDetail.replace(':id', m[2])}?tab=vendor`
  if (m[1] === 'contacts') return ROUTES.contactDetail.replace(':id', m[2])
  if (m[1] === 'products') return ROUTES.productDetail.replace(':id', m[2])
  return null
}

async function fetchItemsFapi(type: CategoryType, categoryId?: number): Promise<Record<number, CategoryLinkedItem[]>> {
  const ids = categoryId ? [categoryId] : (await fetchTreeFapi(type)).items.filter((c) => c.itemCount > 0).map((c) => c.id)
  const out: Record<number, CategoryLinkedItem[]> = {}
  await Promise.all(
    ids.map(async (id) => {
      const d = await fapiGet<{ objects?: { id: number; ref?: string; label?: string; url_path?: string }[] }>(`${FAPI}/list.php`, { type: TYPE_NAME[type], id, limit: 500 })
      out[id] = (d.objects ?? []).map((o) => ({ id: o.id, ref: o.ref ?? '', label: o.label ?? '', to: routeFromUrlPath(o.url_path) }))
    }),
  )
  return out
}

// The records filed under one tag, or under every tag when no id is given (the classic page's "Expand products"
// button), keyed by tag id. categories/fapi gives each member's route key and id, so no HTML anchor is parsed.
export function fetchCategoryItems(type: CategoryType, categoryId?: number): Promise<Record<number, CategoryLinkedItem[]>> {
  return fetchItemsFapi(type, categoryId)
}

export interface CategoryCandidate {
  id: number
  ref: string
  label: string
  linked: boolean
}

// GET categories/fapi/list.php?action=candidates feeds the add-member picker: the records of the tag's type that match
// the search, with the ones already filed under the tag flagged so they are not offered twice.
export async function fetchCategoryCandidates(type: CategoryType, tagId: number, search: string): Promise<CategoryCandidate[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await fapiGet<any>(`${FAPI}/list.php`, { type: TYPE_NAME[type], id: tagId, action: 'candidates', search: search || undefined, limit: 20 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = d.candidates ?? d.items ?? d.objects ?? []
  return list.map((o) => ({
    id: Number(o.id),
    ref: String(o.ref ?? o.code ?? ''),
    label: String(o.label ?? o.name ?? ''),
    linked: Boolean(o.linked ?? o.already_linked ?? o.is_linked ?? o.is_member),
  }))
}

// categories/fapi/assign.php and unassign.php take object_ids (an array; a lone object_id is ignored and nothing is
// attached), file a record under a tag or take it out again (the record itself is
// untouched). Both refresh the tag tree, whose counts change.
export function useCategoryMembership(type: CategoryType) {
  const queryClient = useQueryClient()
  const done = () => queryClient.invalidateQueries({ queryKey: ['categories', type] })
  const assign = useMutation({
    mutationFn: ({ tagId, objectId }: { tagId: number; objectId: number }) => fapiPost(`${FAPI}/assign.php`, { type: TYPE_NAME[type], id: tagId, object_ids: [objectId] }),
    onSuccess: done,
  })
  const unassign = useMutation({
    mutationFn: ({ tagId, objectId }: { tagId: number; objectId: number }) => fapiPost(`${FAPI}/unassign.php`, { type: TYPE_NAME[type], id: tagId, object_ids: [objectId] }),
    onSuccess: done,
  })
  return { assign, unassign }
}

// POST categories/fapi/create.php (409 on a duplicate name at the same level); the colour is stored without the #.
export function useCreateCategory(type: CategoryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; description?: string; color?: string; parentId?: number; visible?: boolean }) => {
      await fapiPost(`${FAPI}/create.php`, {
        type: TYPE_NAME[type],
        label: input.label,
        description: input.description ?? '',
        color: (input.color ?? '').replace('#', ''),
        parent_id: input.parentId && input.parentId > 0 ? input.parentId : 0,
        visible: input.visible !== false,
      })
      return { ok: true }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', type] }),
  })
}

// categories/fapi/update.php (label, description, colour, visibility) and move.php (a new parent; 0 = top level) for
// any of the four tag types. A tag cannot become its own parent or sit under one of its descendants (422), and two
// siblings cannot share a label (409).
export function useUpdateCategory(type: CategoryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: number; label: string; description: string; color: string; parentId: number; previousParentId: number; visible: boolean }) => {
      await fapiPost(`${FAPI}/update.php`, { type: TYPE_NAME[type], id: input.id, label: input.label, description: input.description, color: input.color.replace('#', ''), visible: input.visible })
      if (input.parentId !== input.previousParentId) await fapiPost(`${FAPI}/move.php`, { type: TYPE_NAME[type], id: input.id, parent_id: input.parentId > 0 ? input.parentId : 0 })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', type] }),
  })
}

// Product tags only: product/fapi/categories.php reads one tag and updates or
// deletes it (categories/api/index.php has no write besides create). A move that
// would put a tag inside itself is refused with 422.
export function useUpdateProductCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number; label: string; description: string; color: string; parentId: number; visible: boolean }) =>
      updateProductCategory(input.id, { label: input.label, description: input.description, color: input.color.replace('#', ''), parent: input.parentId > 0 ? input.parentId : 0, visible: input.visible ? 1 : 0 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', 0] }),
  })
}

export type ProductCategoryDeleteCheck = { ok: true; productCount: number } | { ok: false; reason: string }

// What deleting would do, read before asking: a tag with sub-tags is refused
// (they would be unreachable); one on products needs confirm:true, and the
// products survive, only losing the tag.
export async function checkProductCategoryDelete(id: number): Promise<ProductCategoryDeleteCheck> {
  const tag = await getProductCategory(id)
  if (!tag.can_delete) return { ok: false, reason: 'You are not allowed to delete tags.' }
  if (tag.child_count > 0) return { ok: false, reason: `"${tag.label}" has ${tag.child_count} sub-tag${tag.child_count === 1 ? '' : 's'}. Move or delete them first.` }
  return { ok: true, productCount: tag.product_count }
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirm }: { id: number; confirm: boolean }) => deleteProductCategory(id, confirm),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', 0] }),
  })
}
