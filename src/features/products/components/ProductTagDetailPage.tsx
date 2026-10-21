import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, EyeOff, FolderTree, Link2, Loader2, Package, Pencil, Plus, Search, Trash2, Unlink } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, TodayStatCard } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { assignProductCategories, getProductCategory, listProductCategories, searchProducts } from '../../../api/products'
import { checkProductCategoryDelete, fetchCategoryItems, useCategories, useCreateCategory, useDeleteProductCategory, useUpdateProductCategory } from '../../customers/categories.queries'
import { TagFormModal } from '../../customers/components/TagFormModal'
import { ROUTES } from '../../../routes'
import { LegacyErrorCard, LegacyLoadingCard } from './LegacyReportStates'

// One product tag (classic categories/viewcat.php?type=product): header with
// Modify / Delete, sub-tags, and the products filed under it — with search-to-
// assign and unlink. Linking a product rewrites that product's tag list through
// product/fapi/categories.php (assign), so the other tags are read first and kept.
export function ProductTagDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tagId = Number(id)
  const navigate = useNavigate()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const tag = useQuery({ queryKey: ['categories', 'detail', tagId], queryFn: () => getProductCategory(tagId), retry: false })
  const { data: tree } = useCategories(0)
  const linked = useQuery({ queryKey: ['categories', 'items', 0, tagId], queryFn: async () => (await fetchCategoryItems(0, tagId))[tagId] ?? [], retry: false })
  const deleteTag = useDeleteProductCategory()
  const updateTag = useUpdateProductCategory()
  const createTag = useCreateCategory(0)
  const [dialog, setDialog] = useState<'edit' | 'new' | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [term, setTerm] = useState('')
  const [error, setError] = useState('')
  const found = useQuery({ queryKey: ['products', 'tagSearch', term], queryFn: () => searchProducts(term.trim()), enabled: term.trim().length >= 2, staleTime: 1000 * 30 })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] })
    void queryClient.invalidateQueries({ queryKey: ['products'] })
  }
  const relink = useMutation({
    mutationFn: async ({ productId, add }: { productId: number; add: boolean }) => {
      const current = (await listProductCategories(productId)).assigned ?? []
      const next = add ? Array.from(new Set([...current, tagId])) : current.filter((c) => c !== tagId)
      return assignProductCategories(productId, next)
    },
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not update the product.'),
  })

  const back = (
    <Link to={ROUTES.productTags} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover">
      <ArrowLeft size={14} /> Back to list
    </Link>
  )
  if (tag.isLoading) return <LegacyLoadingCard label="Loading the tag…" />
  if (tag.isError || !tag.data) return <div className="space-y-3">{back}<LegacyErrorCard title="Couldn't load this tag" message={tag.error instanceof Error ? tag.error.message : 'Tag not found.'} onRetry={() => tag.refetch()} /></div>

  const t = tag.data
  const subTags = (tree?.items ?? []).filter((c) => c.parentId === tagId)
  // A tag cannot move under itself or one of its own sub-tags.
  const descendants = new Set<number>()
  const walk = (id: number) => {
    for (const c of tree?.items ?? []) if (c.parentId === id && !descendants.has(c.id)) { descendants.add(c.id); walk(c.id) }
  }
  walk(tagId)
  const parent = (tree?.items ?? []).find((c) => c.id === t.parent)
  const items = linked.data ?? []
  const linkedIds = new Set(items.map((i) => i.id))

  async function remove() {
    setError('')
    try {
      const check = await checkProductCategoryDelete(tagId)
      if (!check.ok) return setError(check.reason)
      const ok = await confirm({
        title: 'Delete tag?',
        message: `Delete the tag "${t.label}"?`,
        warningMessage: check.productCount > 0 ? `${check.productCount} product(s) carry this tag. They are kept; they only lose the tag.` : 'The tag is removed permanently.',
      })
      if (!ok) return
      await deleteTag.mutateAsync({ id: tagId, confirm: check.productCount > 0 })
      navigate(ROUTES.productTags)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this tag.')
    }
  }

  return (
    <div className="space-y-4">
      {dialog === 'edit' && (
        <TagFormModal
          mode="edit"
          initial={{ label: t.label, description: t.description, color: t.color ? `#${t.color}` : undefined, parentId: t.parent, visible: t.visible !== 0 }}
          parents={(tree?.items ?? []).filter((c) => c.id !== tagId && !descendants.has(c.id))}
          pending={updateTag.isPending}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(v) =>
            updateTag.mutate(
              { id: tagId, label: v.label, description: v.description, color: v.color, parentId: v.parentId, visible: v.visible },
              { onSuccess: () => { setDialog(null); refresh() }, onError: (e) => setDialogError(e instanceof Error ? e.message : 'Could not save this tag.') },
            )
          }
        />
      )}
      {dialog === 'new' && (
        <TagFormModal
          mode="create"
          initial={{ parentId: tagId }}
          parents={tree?.items ?? []}
          pending={createTag.isPending}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(v) =>
            createTag.mutate(
              { label: v.label, description: v.description, color: v.color, parentId: v.parentId, visible: v.visible },
              { onSuccess: () => { setDialog(null); refresh() }, onError: (e) => setDialogError(e instanceof Error ? e.message : 'Could not save this tag.') },
            )
          }
        />
      )}
      <h2 className="text-lg font-bold text-text!">Products/Services tags/categories area</h2>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {back}
            <span className="h-8 w-8 rounded-md" style={{ backgroundColor: t.color ? `#${t.color}` : '#397db9' }} />
            <div>
              <p className="flex items-center gap-2 text-lg font-bold text-text!">
                {t.label}
                {t.visible === 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-xs font-medium text-white">
                    <EyeOff size={11} /> Hidden
                  </span>
                )}
              </p>
              {t.description && <p className="text-xs text-text-faint">{t.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDialogError('')
                setDialog('edit')
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-sm text-brand hover:bg-brand/10"
            >
              <Pencil size={14} /> Modify
            </button>
            <button type="button" onClick={() => void remove()} disabled={!t.can_delete} className="inline-flex items-center gap-1.5 rounded-md border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger-bg disabled:opacity-50">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </Card>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TodayStatCard label="Sub-categories" value={String(t.child_count)} caption="Sub-categories" icon={FolderTree} color="blue" />
        <TodayStatCard label="Linked items" value={String(t.product_count)} caption="Products" icon={Link2} color="cyan" />
        <TodayStatCard label="Parent tag/category" value={parent?.label ?? '—'} caption="Parent tag/category" icon={FolderTree} color="violet" />
        <TodayStatCard label="Creation date" value={t.date_creation ? new Date(t.date_creation * 1000).toLocaleDateString('en-GB') : '—'} caption={t.created_by ? `Created by ${t.created_by}` : 'Creation date'} icon={CalendarPlus} color="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="!h-auto">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text!">Sub-categories</p>
            <button
              type="button"
              onClick={() => {
                setDialogError('')
                setDialog('new')
              }}
              className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
            >
              <Plus size={12} /> New tag/category
            </button>
          </div>
          {subTags.length === 0 ? (
            <p className="text-sm text-text-faint">No subcategory.</p>
          ) : (
            <ul className="space-y-1">
              {subTags.map((c) => (
                <li key={c.id}>
                  <Link to={ROUTES.productTagDetail.replace(':id', String(c.id))} className="text-sm text-brand hover:underline">
                    {c.label}
                  </Link>{' '}
                  <span className="text-xs text-text-faint">({c.itemCount})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="!h-auto">
          <p className="mb-3 text-sm font-semibold text-text!">Linked items</p>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search — click to assign…" className="w-full rounded-md border border-input-border bg-input-bg py-1.5 pl-8 pr-3 text-sm text-text" />
          </div>
          {term.trim().length >= 2 && (
            <ul className="mb-3 max-h-48 overflow-auto rounded-md border border-border">
              {(found.data?.items ?? []).filter((p) => !linkedIds.has(p.id)).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => relink.mutate({ productId: p.id, add: true })} disabled={relink.isPending} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-hover">
                    <Plus size={12} className="text-brand" /> {p.ref} — {p.label}
                  </button>
                </li>
              ))}
              {found.isFetching && <li className="px-3 py-2 text-xs text-text-faint">Searching…</li>}
            </ul>
          )}
          {linked.isLoading ? (
            <p className="text-sm text-text-faint">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-text-faint">Nothing is filed under this tag.</p>
          ) : (
            <ul className="max-h-[50vh] divide-y divide-border overflow-auto">
              {items.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <Package size={16} className="text-warning" />
                  <span className="flex-1 text-sm">
                    <Link to={ROUTES.productDetail.replace(':id', String(p.id))} className="font-medium text-brand hover:underline">
                      {p.label || p.ref}
                    </Link>
                    <span className="block text-xs text-text-faint">Ref: {p.ref}</span>
                  </span>
                  <button type="button" onClick={() => relink.mutate({ productId: p.id, add: false })} disabled={relink.isPending} aria-label={`Remove ${p.ref} from this tag`} title="Remove from this tag" className="text-text-muted hover:text-danger">
                    {relink.isPending && relink.variables?.productId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
