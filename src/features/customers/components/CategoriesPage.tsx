import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listProductCategories } from '../../../api/products'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronDown, ChevronRight, Folder, FolderOpen, Link2, Loader2, Network, Eye, Package, Pencil, Plus, Search, Tag, Tags, UsersRound, X } from 'lucide-react'
import { Card, TodayStatCard } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import {
  fetchCategoryItems,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  type CategoryLinkedItem,
  type CategoryRow,
  type CategoryType,
} from '../categories.queries'
import { TagFormModal, type TagFormValues } from './TagFormModal'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const toolbarBtn = 'flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60'

// What the tagged records are called in the cards and the empty states.
const ITEM_NOUN: Record<CategoryType, string> = { 0: 'Products', 1: 'Vendors', 2: 'Customers', 4: 'Contacts' }

function TaggedItem({ item, type }: { item: CategoryLinkedItem; type: CategoryType }) {
  const text = [item.ref, item.label].filter(Boolean).join(' ') || `#${item.id}`
  const to = item.to
  const Icon = type === 0 ? Package : UsersRound
  return (
    <li className="flex items-center gap-2 py-0.5 text-sm">
      <Icon size={13} className="shrink-0 text-text-faint" />
      {to ? (
        <Link to={to} className="text-brand hover:underline">
          {text}
        </Link>
      ) : (
        <span className="text-text!">{text}</span>
      )}
    </li>
  )
}

// The classic tags/categories page (see categories.queries.ts): four summary
// cards, the tag tree with expand / collapse, the records filed under each tag
// and the real "new tag" form behind the + button. Shared between Product/Service
// (type=0), Vendor (1), Customer (2) and Contact (4) Tags/Categories — the same
// UI over the same table, filtered by category type. Product tags can also be
// edited from the card (product/fapi/categories.php); the other types are edited in place through categories/fapi.
export function CategoriesPage({ type, title }: { type: CategoryType; title: string }) {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error: queryError } = useCategories(type, search)
  const createCategory = useCreateCategory(type)
  const updateCategory = useUpdateCategory(type)
  const canEdit = type === 0

  const [editing, setEditing] = useState<CategoryRow | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  // Tags whose children are showing, and the records loaded for a tag (a tag
  // that is in `shown` but not yet in `items` is still loading).
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [items, setItems] = useState<Record<number, CategoryLinkedItem[]>>({})
  const [shown, setShown] = useState<Set<number>>(new Set())
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [itemsError, setItemsError] = useState('')

  const rows = useMemo(() => data?.items ?? [], [data])
  const [urlParams, setUrlParams] = useSearchParams()
  const editParam = Number(urlParams.get('edit')) || 0
  const [handledEdit, setHandledEdit] = useState(0)
  const editTarget = canEdit && editParam && editParam !== handledEdit ? rows.find((c) => c.id === editParam) : undefined
  const searching = search.trim() !== ''
  const children = useMemo(() => {
    const ids = new Set(rows.map((c) => c.id))
    const map = new Map<number, CategoryRow[]>()
    for (const c of rows) {
      // A tag whose parent is missing hangs under the root, as on the classic page.
      const parent = c.parentId && ids.has(c.parentId) ? c.parentId : 0
      map.set(parent, [...(map.get(parent) ?? []), c])
    }
    return map
  }, [rows])
  // Product tags only: product/fapi/categories.php carries the creation date and author the tree lacks.
  const { data: tagDates } = useQuery({
    queryKey: ['products', 'tagDates'],
    queryFn: async () => new Map((await listProductCategories()).categories.map((c) => [c.id, c])),
    enabled: type === 0,
    staleTime: 1000 * 60,
    retry: false,
  })
  const createdThisMonth = useMemo(() => {
    if (!tagDates) return null
    const now = new Date()
    return [...tagDates.values()].filter((c) => c.date_creation && new Date(c.date_creation * 1000).getMonth() === now.getMonth() && new Date(c.date_creation * 1000).getFullYear() === now.getFullYear()).length
  }, [tagDates])
  const stats = data?.stats

  // A tag cannot move under itself or under one of its own sub-tags.
  const editParentOptions = useMemo(() => {
    if (!editing) return rows
    const blocked = new Set<number>([editing.id])
    const walk = (id: number) => {
      for (const k of children.get(id) ?? []) {
        blocked.add(k.id)
        walk(k.id)
      }
    }
    walk(editing.id)
    return rows.filter((c) => !blocked.has(c.id))
  }, [editing, rows, children])

  if (editTarget) {
    // Arrived from a tag card's Modify button: open that tag's dialog once.
    setHandledEdit(editParam)
    setUrlParams({}, { replace: true })
    setShowForm(false)
    setError('')
    setEditing(editTarget)
  }

  function handleUpdate(v: TagFormValues) {
    if (!editing) return
    setError('')
    updateCategory.mutate(
      { id: editing.id, label: v.label, description: v.description, color: v.color, parentId: v.parentId, previousParentId: editing.parentId || 0, visible: v.visible },
      {
        onSuccess: () => setEditing(null),
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save this tag — please try again.'),
      },
    )
  }

  function handleSave(v: TagFormValues) {
    setError('')
    createCategory.mutate(
      { label: v.label, description: v.description, color: v.color, parentId: v.parentId, visible: v.visible },
      {
        onSuccess: () => setShowForm(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save this tag — please try again.'),
      },
    )
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleItems(id: number) {
    if (shown.has(id)) {
      setShown((prev) => new Set([...prev].filter((x) => x !== id)))
      return
    }
    setShown((prev) => new Set(prev).add(id))
    if (items[id]) return
    setItemsError('')
    setLoadingId(id)
    try {
      const loaded = await fetchCategoryItems(type, id)
      setItems((prev) => ({ ...prev, [id]: loaded[id] ?? [] }))
    } catch (e) {
      setItemsError(e instanceof Error ? e.message : 'Could not load the tagged items.')
      setShown((prev) => new Set([...prev].filter((x) => x !== id)))
    } finally {
      setLoadingId(null)
    }
  }

  // "Expand products" on the classic page: open every tag and list the records under all of them.
  async function expandItems() {
    setItemsError('')
    setLoadingAll(true)
    try {
      const loaded = await fetchCategoryItems(type)
      const all: Record<number, CategoryLinkedItem[]> = {}
      for (const c of rows) all[c.id] = loaded[c.id] ?? []
      setItems(all)
      setShown(new Set(rows.filter((c) => c.itemCount > 0).map((c) => c.id)))
      setExpanded(new Set(rows.filter((c) => (children.get(c.id) ?? []).length > 0).map((c) => c.id)))
    } catch (e) {
      setItemsError(e instanceof Error ? e.message : 'Could not load the tagged items.')
    } finally {
      setLoadingAll(false)
    }
  }

  function renderNode(c: CategoryRow, depth: number, nested: boolean) {
    const kids = nested ? (children.get(c.id) ?? []) : []
    const open = expanded.has(c.id)
    const showItems = shown.has(c.id)
    return (
      <li key={c.id}>
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 24 }}>
          <button
            type="button"
            onClick={() => toggleExpanded(c.id)}
            disabled={kids.length === 0}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted disabled:invisible"
          >
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div className="flex flex-1 items-center rounded-md bg-brand/10 px-3 py-1.5 text-sm text-text!" title={c.description ?? undefined}>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color ? `#${c.color}` : '#397db9' }} />
              {canEdit ? (
                <Link to={ROUTES.productTagDetail.replace(':id', String(c.id))} className="hover:underline">
                  {nested ? c.label : c.fullLabel}
                </Link>
              ) : nested ? (
                c.label
              ) : (
                c.fullLabel
              )}
            </span>
          </div>
          {type === 0 && tagDates?.get(c.id)?.date_creation ? (
            <span className="hidden shrink-0 text-xs text-text-faint sm:inline" title="Created">
              {new Date((tagDates.get(c.id)!.date_creation as number) * 1000).toLocaleDateString('en-GB')}
              {tagDates.get(c.id)?.created_by ? ` · ${tagDates.get(c.id)!.created_by}` : ''}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleItems(c.id)}
            disabled={c.itemCount === 0}
            title={c.itemCount === 0 ? 'Nothing is filed under this tag' : showItems ? 'Hide the tagged items' : 'Show the tagged items'}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-brand px-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {loadingId === c.id ? <Loader2 size={12} className="animate-spin" /> : c.itemCount}
          </button>
          {canEdit ? (
            <Link to={ROUTES.productTagDetail.replace(':id', String(c.id))} aria-label={`View ${c.label}`} title="View" className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-brand">
              <Eye size={16} />
            </Link>
          ) : (
            <button type="button" aria-label={`Modify ${c.label}`} title="Modify" onClick={() => { setError(''); setEditing(c) }} className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-brand">
              <Pencil size={15} />
            </button>
          )}
        </div>
        {showItems && items[c.id] && (
          <ul className="mb-1 space-y-0.5 border-l border-border pl-3" style={{ marginLeft: depth * 24 + 40 }}>
            {items[c.id].length === 0 ? <li className="text-xs italic text-text-faint">Nothing is filed under this tag.</li> : items[c.id].map((item) => <TaggedItem key={item.id} item={item} type={type} />)}
          </ul>
        )}
        {kids.length > 0 && open && <ul>{kids.map((k) => renderNode(k, depth + 1, true))}</ul>}
      </li>
    )
  }

  const roots = children.get(0) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tag size={20} className="text-brand" /> {title}
        </h2>
        <InBanner>
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setError('')
              setShowForm(true)
            }}
            className="flex items-center justify-center h-9 px-3 rounded-lg bg-brand text-white hover:bg-brand-hover"
          >
            <Plus size={16} />
            <span className="ml-1.5 text-sm font-medium">New tag/category</span>
          </button>
        </InBanner>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayStatCard label="Tags/categories" value={stats ? String(stats.total) : '—'} caption="Tags/categories" icon={Tags} color="blue" />
        <TodayStatCard label="Parent tag/category" value={stats ? String(stats.roots) : '—'} caption="Parent tag/category" icon={Network} color="violet" />
        <TodayStatCard label="Linked items" value={stats ? String(stats.linked) : '—'} caption={`Tag/category / ${ITEM_NOUN[type]}`} icon={Link2} color="cyan" />
        <TodayStatCard label="Created this month" value={createdThisMonth !== null && type === 0 ? String(createdThisMonth) : stats ? String(stats.createdThisMonth) : '—'} caption="New tags/categories" icon={CalendarPlus} color="green" />
      </div>

      {showForm && (
        <TagFormModal mode="create" parents={rows} pending={createCategory.isPending} error={error} onSubmit={handleSave} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <TagFormModal
          key={editing.id}
          mode="edit"
          initial={{ label: editing.label, description: editing.description ?? '', color: editing.color ? `#${editing.color}` : undefined, parentId: editing.parentId || 0 }}
          parents={editParentOptions}
          pending={updateCategory.isPending}
          error={error}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls + ' w-full pl-8 pr-8'} placeholder="Name" />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={toolbarBtn} onClick={() => setExpanded(new Set())}>
            <Folder size={14} /> Undo expand
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setExpanded(new Set(rows.filter((c) => (children.get(c.id) ?? []).length > 0).map((c) => c.id)))}>
            <FolderOpen size={14} /> Expand all
          </button>
          <button type="button" className={toolbarBtn} disabled={loadingAll || rows.length === 0} onClick={() => void expandItems()}>
            {loadingAll ? <Loader2 size={14} className="animate-spin" /> : <UsersRound size={14} />} Expand {ITEM_NOUN[type]}
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setShown(new Set())}>
            <Folder size={14} /> Collapse {ITEM_NOUN[type]}
          </button>
        </div>
      </div>

      {itemsError && <p className="text-sm text-danger">{itemsError}</p>}

      <Card className="!h-auto">
        {isLoading ? (
          <p className="text-sm text-text-faint italic">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-danger">{queryError instanceof Error ? queryError.message : 'Could not load tags/categories.'}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-faint italic">{searching ? `No tags/categories match "${search}".` : 'No tag/category of this type created'}</p>
        ) : searching ? (
          // While searching, the matches are listed flat with their full path.
          <ul>{rows.map((c) => renderNode(c, 0, false))}</ul>
        ) : (
          <ul>{roots.map((c) => renderNode(c, 0, true))}</ul>
        )}
      </Card>
    </div>
  )
}
