import { useStickyTop } from '../useStickyTop'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Folder, FolderOpen, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useAdminMenus, useDeleteMenu, useMoveMenu, useSaveMenu, type AdminMenu, type MenuInput } from '../adminSetup.data'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'
const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

// The classic form's defaults (admin/menus/edit.php?action=create): position 100, enabled "1", permissions "1".
const BLANK: MenuInput = { handler: 'all', type: '', mainmenu: '', leftmenu: '', parentId: 0, title: '', url: '', langs: '', position: 100, enabled: '1', perms: '1', target: '' }

const USERS: Record<number, string> = { 0: 'Internal', 1: 'External', 2: 'All' }

const fromEntry = (m: AdminMenu): MenuInput => ({ id: m.id, handler: m.handler, type: m.type, mainmenu: m.mainmenu, leftmenu: m.leftmenu, parentId: m.parentId, title: m.title, url: m.url, langs: m.langs, position: m.position, enabled: m.enabled, perms: m.perms, target: m.target, usertype: m.usertype ?? undefined })

// The create / edit form of the classic admin/menus/edit.php: Menu handler, Users, Type, Main menu, Parent menu, Title, URL, Language file,
// Position, Target, Enabled, Permissions. "Users" is saved as usertype (menu_save.php stores it since 6 Nov 2026); a new entry starts on All, as the classic form does.
export function MenuEntryForm({ initial, usertype, handlers, onDone }: { initial?: MenuInput; usertype?: number | null; handlers: string[]; onDone: () => void }) {
  const [form, setForm] = useState<MenuInput>(initial ? { ...initial, usertype: usertype ?? initial.usertype } : { ...BLANK, usertype: 2 })
  const [problem, setProblem] = useState('')
  const save = useSaveMenu()
  const set = <K extends keyof MenuInput>(key: K, value: MenuInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function submit() {
    setProblem('')
    try {
      await save.mutateAsync(form)
      onDone()
    } catch (e) {
      setProblem(message(e, 'Could not save this menu entry.'))
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="text-xs text-text-faint">{label}</label>
      <div className="mt-1">{node}</div>
    </div>
  )

  return (
    <Card className="!h-auto">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('Menu handler', (
          <select value={form.handler} onChange={(e) => set('handler', e.target.value)} disabled={!!form.id} className={`${inputCls} w-full`}>
            {handlers.map((h) => <option key={h} value={h}>{h === 'all' ? 'All' : h}</option>)}
          </select>
        ))}
        {field('Users', (
          <select value={form.usertype ?? ''} onChange={(e) => set('usertype', e.target.value === '' ? undefined : Number(e.target.value))} aria-label="Users" className={`${inputCls} w-full`}>
            {form.usertype === undefined && <option value="">—</option>}
            {Object.entries(USERS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {field('Type', (
          <select value={form.type} onChange={(e) => set('type', e.target.value)} aria-label="Type" className={`${inputCls} w-full`}>
            <option value="" />
            <option value="top">Top</option>
            <option value="left">Left</option>
          </select>
        ))}
        {field('Main menu', <input value={form.mainmenu} onChange={(e) => set('mainmenu', e.target.value)} aria-label="Main menu" className={`${inputCls} w-full`} />)}
        {field('Parent menu (id, 0 = none)', <input type="number" min={0} value={form.parentId} onChange={(e) => set('parentId', Number(e.target.value) || 0)} aria-label="Parent menu" className={`${inputCls} w-full`} />)}
        {field('Title', <input value={form.title} onChange={(e) => set('title', e.target.value)} aria-label="Title" className={`${inputCls} w-full`} />)}
        {field('URL', <input value={form.url} onChange={(e) => set('url', e.target.value)} aria-label="URL" className={`${inputCls} w-full`} />)}
        {field('Language file', <input value={form.langs} onChange={(e) => set('langs', e.target.value)} aria-label="Language file" className={`${inputCls} w-full`} />)}
        {field('Position', <input type="number" value={form.position} onChange={(e) => set('position', Number(e.target.value) || 0)} aria-label="Position" className={`${inputCls} w-full`} />)}
        {field('Target', (
          <select value={form.target} onChange={(e) => set('target', e.target.value)} aria-label="Target" className={`${inputCls} w-full`}>
            <option value="" />
            <option value="_blank">_blank</option>
          </select>
        ))}
        {field('Enabled', <input value={form.enabled} onChange={(e) => set('enabled', e.target.value)} aria-label="Enabled" className={`${inputCls} w-full`} />)}
        {field('Permissions', <input value={form.perms} onChange={(e) => set('perms', e.target.value)} aria-label="Permissions" className={`${inputCls} w-full`} />)}
      </div>
      {problem && <p className="mt-3 text-sm text-danger">{problem}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={submit} disabled={save.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {save.isPending && <LoaderCircle size={14} className="animate-spin" />} {form.id ? 'Save' : 'Create Menu Entry'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border px-6 py-2.5 text-sm text-text-muted hover:text-text">Cancel</button>
      </div>
    </Card>
  )
}

// The tree of admin/menus/fapi/menus.php with its writers (menu_save, menu_move, menu_delete), like the classic "Personalized menus" page: a header with
// "Undo expand | Expand all", then the entries nested under their parent (fk_menu), each with Modify, Add (an entry under this one), Delete, Up and Down.
// The API returns the entries flat (617 on newecuenta, one call); the nesting is rebuilt here from the parent id. An entry whose parent is not in the
// list (a left entry under a menu defined in code) is a root.
type MenuNode = AdminMenu & { children: MenuNode[] }

export function buildMenuTree(items: AdminMenu[]): MenuNode[] {
  const byId = new Map<number, MenuNode>(items.map((m) => [m.id, { ...m, children: [] }]))
  const roots: MenuNode[] = []
  for (const n of byId.values()) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined
    if (parent && parent !== n) parent.children.push(n)
    else roots.push(n)
  }
  const order = (list: MenuNode[]) => {
    list.sort((x, y) => x.position - y.position)
    list.forEach((n) => order(n.children))
  }
  order(roots)
  return roots
}

export function MenuEntriesAdmin() {
  const [type, setType] = useState('')
  const { data, isLoading, isError, error, refetch } = useAdminMenus('all', type, 1, 1000)
  const move = useMoveMenu()
  const remove = useDeleteMenu()
  const confirm = useConfirm()
  const [form, setForm] = useState<{ initial?: MenuInput; usertype?: number | null } | null>(null)
  const [problem, setProblem] = useState('')
  const [open, setOpen] = useState<Set<number>>(new Set())
  const stickyTop = useStickyTop()
  const roots = useMemo(() => buildMenuTree(data?.items ?? []), [data])

  async function act(run: () => Promise<unknown>, fallback: string) {
    setProblem('')
    try {
      await run()
    } catch (e) {
      setProblem(message(e, fallback))
    }
  }

  const del = async (m: AdminMenu) => {
    if (!(await confirm({ title: 'Delete menu entry', message: `Are you sure you want to delete "${m.title}"?` }))) return
    await act(() => remove.mutateAsync(m.id), 'Could not delete this menu entry.')
  }

  const toggleOpen = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const expandAll = () => setOpen(new Set((data?.items ?? []).map((m) => m.id)))

  if (form) return <MenuEntryForm initial={form.initial} usertype={form.usertype} handlers={data?.handlers ?? ['all']} onDone={() => setForm(null)} />

  const icon = 'rounded-md p-1.5 text-text-faint hover:bg-surface-hover disabled:opacity-60'
  const renderNode = (n: MenuNode, depth: number) => {
    const isOpen = open.has(n.id)
    return (
      <li key={n.id} data-menu-id={n.id}>
        <div className="flex items-center justify-between gap-2 border-b border-border py-1 text-sm hover:bg-surface-hover" style={{ paddingLeft: depth * 22 + 8 }}>
          <span className="flex min-w-0 items-center gap-1.5">
            {n.children.length > 0 ? (
              <button type="button" aria-label={isOpen ? `Collapse ${n.title}` : `Expand ${n.title}`} aria-expanded={isOpen} onClick={() => toggleOpen(n.id)} className="text-text-muted hover:text-text">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="inline-block w-3.5" />
            )}
            <button type="button" onClick={() => setForm({ initial: fromEntry(n), usertype: n.usertype })} className="truncate text-left text-sm font-semibold text-text! hover:text-brand">
              {n.title || '—'}
            </button>
          </span>
          <span className="flex shrink-0 items-center">
            <button type="button" title="Modify" aria-label={`Modify ${n.title}`} onClick={() => setForm({ initial: fromEntry(n), usertype: n.usertype })} className={`${icon} hover:text-brand`}>
              <Pencil size={14} />
            </button>
            <button type="button" title="Add an entry under this one" aria-label={`Add under ${n.title}`} onClick={() => setForm({ initial: { ...BLANK, handler: n.handler, type: 'left', mainmenu: n.mainmenu, parentId: n.id } })} className={`${icon} hover:text-brand`}>
              <Plus size={14} />
            </button>
            <button type="button" title="Delete" aria-label={`Delete ${n.title}`} disabled={remove.isPending} onClick={() => del(n)} className={`${icon} hover:text-danger`}>
              <Trash2 size={14} />
            </button>
            <span className="w-6" />
            <button type="button" title="Up" aria-label={`Move ${n.title} up`} disabled={move.isPending} onClick={() => act(() => move.mutateAsync({ id: n.id, direction: 'up' }), 'Could not move this entry.')} className={`${icon} hover:text-text`}>
              <ChevronUp size={14} />
            </button>
            <button type="button" title="Down" aria-label={`Move ${n.title} down`} disabled={move.isPending} onClick={() => act(() => move.mutateAsync({ id: n.id, direction: 'down' }), 'Could not move this entry.')} className={`${icon} hover:text-text`}>
              <ChevronDown size={14} />
            </button>
          </span>
        </div>
        {isOpen && n.children.length > 0 && <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    )
  }

  return (
    <Card className="!h-auto !p-0 overflow-clip">
      {/* The Create button sits in the page banner, like the other pages' main action. */}
      <InBanner>
        <button type="button" onClick={() => setForm({})} className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Create new menu
        </button>
      </InBanner>
      {/* One sticky row: the type filter, the title and the expand controls. */}
      <div className="sticky z-10 bg-surface" style={{ top: stickyTop }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
          <span className="text-sm font-semibold text-text">Personalized menus</span>
          <div className="ml-auto flex flex-wrap items-center gap-8">
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Menu type" className={inputCls}>
              <option value="">All types</option>
              <option value="top">Top</option>
              <option value="left">Left</option>
            </select>
            <span className="text-sm text-text-muted">
              <button type="button" onClick={() => setOpen(new Set())} className="inline-flex items-center gap-1 hover:text-text">
                <Folder size={14} /> Undo expand
              </button>
              <span className="mx-4">|</span>
              <button type="button" onClick={expandAll} className="inline-flex items-center gap-1 hover:text-text">
                <FolderOpen size={14} /> Expand all
              </button>
            </span>
          </div>
        </div>
        {problem && <p className="border-b border-border px-4 py-2 text-sm text-danger">{problem}</p>}
      </div>
      <ul>{roots.map((n) => renderNode(n, 0))}</ul>
      {data && roots.length === 0 && <p className="px-4 py-6 text-center text-sm italic text-text-faint">No menu entry.</p>}
      {isLoading && <LegacyLoadingCard label="Loading menu entries…" />}
      {isError && <LegacyErrorCard title="Couldn't load the menu entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
    </Card>
  )
}
