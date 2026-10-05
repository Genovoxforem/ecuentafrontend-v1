import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronDown, ChevronRight, Folder, FolderOpen, Link2, Loader2, Network, Plus, Search, Tag, Tags, UsersRound, X } from 'lucide-react'
import { Card, TodayStatCard } from '../../../shared/components/dashboard/DashboardKit'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import { fetchCategoryItems, useCategories, useCreateCategory, type CategoryLinkedItem, type CategoryRow, type CategoryType } from '../categories.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const toolbarBtn = 'flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60'

// What the tagged records are called in the cards and the empty states.
const ITEM_NOUN: Record<CategoryType, string> = { 1: 'Vendors', 2: 'Customers', 4: 'Contacts' }

function TaggedItem({ item }: { item: CategoryLinkedItem }) {
  const text = [item.ref, item.label].filter(Boolean).join(' ') || `#${item.id}`
  const to = resolveLegacyRoute(item.href)
  return (
    <li className="flex items-center gap-2 py-0.5 text-sm">
      <UsersRound size={13} className="shrink-0 text-text-faint" />
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
// and the real "new tag" form behind the + button. Shared between Customer
// Tags/Categories (type=2) and Contact Tags/Categories (type=4) — the same UI
// over the same table, filtered by category type.
export function CategoriesPage({ type, title }: { type: CategoryType; title: string }) {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error: queryError } = useCategories(type, search)
  const createCategory = useCreateCategory(type)

  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState(-1)
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
  const stats = data?.stats

  function handleSave() {
    if (!label.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    createCategory.mutate(
      { label: label.trim(), description: description.trim(), parentId },
      {
        onSuccess: () => {
          setLabel('')
          setDescription('')
          setParentId(-1)
          setShowForm(false)
        },
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
              {nested ? c.label : c.fullLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void toggleItems(c.id)}
            disabled={c.itemCount === 0}
            title={c.itemCount === 0 ? 'Nothing is filed under this tag' : showItems ? 'Hide the tagged items' : 'Show the tagged items'}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-brand px-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {loadingId === c.id ? <Loader2 size={12} className="animate-spin" /> : c.itemCount}
          </button>
        </div>
        {showItems && items[c.id] && (
          <ul className="mb-1 space-y-0.5 border-l border-border pl-3" style={{ marginLeft: depth * 24 + 40 }}>
            {items[c.id].length === 0 ? <li className="text-xs italic text-text-faint">Nothing is filed under this tag.</li> : items[c.id].map((item) => <TaggedItem key={item.id} item={item} />)}
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
        <button type="button" onClick={() => setShowForm((v) => !v)} aria-label={showForm ? 'Close the new tag form' : 'New tag'} className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover">
          {showForm ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayStatCard label="Tags/categories" value={stats ? String(stats.total) : '—'} caption="Tags/categories" icon={Tags} color="blue" />
        <TodayStatCard label="Parent tag/category" value={stats ? String(stats.roots) : '—'} caption="Parent tag/category" icon={Network} color="violet" />
        <TodayStatCard label="Linked items" value={stats ? String(stats.linked) : '—'} caption={`Tag/category / ${ITEM_NOUN[type]}`} icon={Link2} color="cyan" />
        <TodayStatCard label="Created this month" value={stats ? String(stats.createdThisMonth) : '—'} caption="New tags/categories" icon={CalendarPlus} color="green" />
      </div>

      {showForm && (
        <Card className="!h-auto">
          {error && <p className="mb-3 whitespace-pre-line text-sm font-medium text-danger">{error}</p>}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Name</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Add in</label>
              <select value={parentId} onChange={(e) => setParentId(Number(e.target.value))} className={inputCls}>
                <option value={-1}>No parent</option>
                {rows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullLabel}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" disabled={createCategory.isPending} onClick={handleSave} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              Save
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-text-muted">Name:</label>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls + ' w-full pl-8'} placeholder="Search" />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={toolbarBtn} onClick={() => setExpanded(new Set())}>
            <Folder size={14} /> Undo expand
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setExpanded(new Set(rows.filter((c) => (children.get(c.id) ?? []).length > 0).map((c) => c.id)))}>
            <FolderOpen size={14} /> Expand all
          </button>
          <button type="button" className={toolbarBtn} disabled={loadingAll || rows.length === 0} onClick={() => void expandItems()}>
            {loadingAll ? <Loader2 size={14} className="animate-spin" /> : <UsersRound size={14} />} Expand {ITEM_NOUN[type].toLowerCase()}
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setShown(new Set())}>
            <Folder size={14} /> Collapse {ITEM_NOUN[type].toLowerCase()}
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
