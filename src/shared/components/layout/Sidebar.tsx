import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, type NavigateFunction, type Location } from 'react-router-dom'
import { LayoutGrid, Plus, X, Loader2 } from 'lucide-react'
import type { NavItem, NavLeafItem } from '../../../features/navTypes'
import { useAppMenu } from '../../nav/appMenu.queries'
import { buildNavSections } from '../../nav/buildNavSections'
import { PATH_SOURCE_SECTIONS, EMPTY_SECTION_HOME_PATH } from '../../nav/pathSourceSections'
import { prefetchRoute } from '../../../app/routePrefetch'

// Kept as one pair so the rail's width and the collapsed flyout's left-offset
// (which must butt up against the rail) can never drift out of sync.
const RAIL_WIDTH_CLASS = 'w-[72px]'
const RAIL_WIDTH_OFFSET_CLASS = 'left-[72px]'

// "Soft view": leaf items get a gentler, slower hover than a flat bg-swap —
// a soft tint + a barely-there rightward nudge + soft shadow, eased over a
// longer duration so the flyout feels calm rather than snappy.
function SidebarLeaf({
  item,
  depth,
  navigate,
  location,
}: {
  item: NavLeafItem
  depth: number
  navigate: NavigateFunction
  location: Location
}) {
  const isLink = Boolean(item.path)
  const isCurrent = isLink && location.pathname === item.path
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (loading && location.pathname === item.path) setLoading(false)
  }, [location.pathname, loading, item.path])

  return (
    <button
      type="button"
      disabled={!isLink || loading}
      onClick={isLink ? () => { setLoading(true); navigate(item.path!) } : undefined}
      onMouseEnter={isLink ? () => prefetchRoute(item.path!) : undefined}
      style={{ paddingLeft: `${depth * 0.75 + 0.75}rem` }}
      className={`w-full flex items-start gap-2 text-left py-1.5 pr-2 rounded-md text-[13px] leading-4 transition-colors ${
        isCurrent
          ? 'text-brand font-semibold'
          : isLink
            ? 'text-text-muted hover:text-brand hover:bg-brand/5 cursor-pointer'
            : 'text-text-faint cursor-default'
      }`}
    >
      {loading ? (
        <Loader2 size={10} className="mt-1 shrink-0 animate-spin text-brand" />
      ) : (
        <span className={`mt-1 w-1.5 h-1.5 border shrink-0 ${isCurrent ? 'border-brand bg-brand' : 'border-text-faint'}`} />
      )}
      <span>{item.label}</span>
    </button>
  )
}

// Recursive: a group can itself contain groups (real depth varies by module
// — most are 2 levels, a few like Employee/General Ledger go to 3).
// Accordion at every level: opening a group closes whichever *sibling*
// group (same immediate parent) was previously pinned open — but never
// touches its own ancestors or descendants, which is a different axis
// entirely (see toggleGroup's groupKey/parentKey scheme below).
function SidebarNavItem({
  item,
  depth,
  parentKey,
  navigate,
  location,
  openGroups,
  toggleGroup,
  hoverGroup,
  setHoverGroup,
}: {
  item: NavItem
  depth: number
  parentKey: string
  navigate: NavigateFunction
  location: Location
  openGroups: Record<string, boolean>
  toggleGroup: (groupKey: string, parentKey: string) => void
  hoverGroup: ReadonlySet<string>
  setHoverGroup: (updater: (prev: Set<string>) => Set<string>) => void
}) {
  if (!('items' in item) || !item.items) {
    return <SidebarLeaf item={item} depth={depth} navigate={navigate} location={location} />
  }
  // Full ancestor path, not just depth — depth alone can't tell two
  // same-depth groups under different parents apart, which would make the
  // accordion incorrectly close a group in an unrelated branch.
  const groupKey = `${parentKey}>${item.label}`
  const isPinned = Boolean(openGroups[groupKey])
  const isOpen = isPinned || hoverGroup.has(groupKey) || depth === 0
  return (
    <div
      className="pt-0.5 first:pt-0"
      // A nested group's own mouse-enter/leave only adds/removes *its own*
      // key — never overwrites a single shared value — so hovering into a
      // child (physically still inside every ancestor's box) can't blow
      // away the ancestor chain's open state. Previously this used one
      // `hoverGroup: string | null` for the whole tree: entering a nested
      // group clobbered it, so an ancestor's `isOpen` (derived from that
      // same value) flipped false and its grid-rows transition started
      // collapsing mid-hover — even though the mouse never left it — which
      // is what made clicks on deeper items intermittently miss.
      onMouseEnter={() => setHoverGroup((prev) => (prev.has(groupKey) ? prev : new Set(prev).add(groupKey)))}
      onMouseLeave={() =>
        setHoverGroup((prev) => {
          if (!prev.has(groupKey)) return prev
          const next = new Set(prev)
          next.delete(groupKey)
          return next
        })
      }
    >
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => toggleGroup(groupKey, parentKey)}
          style={{ paddingLeft: `${depth * 0.75 + 0.25}rem` }}
          className={`flex-1 min-w-0 text-left py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
            isPinned ? 'text-brand' : 'text-text-muted hover:text-text'
          }`}
        >
          <span className="truncate">{item.label}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleGroup(groupKey, parentKey)}
          title={`${isOpen ? 'Collapse' : 'Expand'} ${item.label}`}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
            isOpen ? 'bg-brand text-white' : 'bg-brand/90 text-white hover:bg-brand'
          }`}
        >
          <Plus size={11} strokeWidth={3} className={`transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {item.items.map((sub, i) => (
            <SidebarNavItem
              // Index-qualified: the dynamic backend menu (ecuenta9) can
              // legitimately contain sibling items with the same label
              // (e.g. two different "Statistics" pages under one section) —
              // label alone isn't a safe React key there, unlike the
              // hand-curated static fallback nav where it always was.
              key={`${sub.label}-${i}`}
              item={sub}
              depth={depth + 1}
              parentKey={groupKey}
              navigate={navigate}
              location={location}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              hoverGroup={hoverGroup}
              setHoverGroup={setHoverGroup}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function itemContainsPath(item: NavItem, pathname: string): boolean {
  if ('items' in item) return item.items.some((sub) => itemContainsPath(sub, pathname))
  return item.path === pathname
}

export function Sidebar({ open = true, onClose, onOpen }: { open?: boolean; onClose?: () => void; onOpen?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: menu } = useAppMenu()
  // GET /api/menu/'s real backend response drives the section list itself;
  // PATH_SOURCE_SECTIONS only supplies each real label's already-verified
  // React path (see buildNavSections) and covers the one frame before the
  // request resolves.
  const SECTIONS = useMemo(() => {
    const sections = menu ? buildNavSections(menu, PATH_SOURCE_SECTIONS, LayoutGrid) : []
    return sections.length > 0 ? sections : PATH_SOURCE_SECTIONS
  }, [menu])
  const [activeKey, setActiveKey] = useState('home')
  const [hovering, setHovering] = useState(false)
  // Accordion, keyed by full ancestor path (see SidebarNavItem's groupKey):
  // clicking a header pins it open and closes whichever *sibling* — same
  // immediate parent — was previously pinned, but leaves ancestors and
  // descendants alone (those are different branches of the map, not
  // touched by a sibling swap). Stays open, highlighted, ignoring
  // mouse-leave, until clicked again or a sibling takes over. Hovering is a
  // separate, temporary preview (hoverGroup) that never touches this pinned
  // state, so moving the mouse away only closes groups that were never
  // actually clicked.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [hoverGroup, setHoverGroup] = useState<Set<string>>(() => new Set())
  const active = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0]

  // Sync activeKey to the current route's section — but ONLY when the route
  // changes (location.pathname) or the menu data loads (SECTIONS), never when
  // activeKey itself changes. Without excluding activeKey from the deps, this
  // effect fires every time the user clicks a rail icon (which sets
  // activeKey), immediately overriding their selection back to whatever
  // section holds the current page — so the flyout panel never shows the
  // clicked section's children.
  useEffect(() => {
    const currentSection = SECTIONS.find((section) => section.items.some((item) => itemContainsPath(item, location.pathname)))
    if (currentSection) setActiveKey(currentSection.key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SECTIONS, location.pathname])

  // Whichever chain of groups holds the current page gets pinned open (same
  // as clicking each header down the chain) — covers both clicking a
  // sub-menu link (which navigates here) and landing on a URL directly, so
  // the active item is never hidden inside a collapsed group at any depth.
  useEffect(() => {
    function findOpenChain(items: NavItem[], parentKey: string): string[] | null {
      for (const item of items) {
        if (!('items' in item) || !item.items) continue
        if (itemContainsPath(item, location.pathname)) {
          const groupKey = `${parentKey}>${item.label}`
          const nested = findOpenChain(item.items, groupKey)
          return nested ? [groupKey, ...nested] : [groupKey]
        }
      }
      return null
    }
    const chain = findOpenChain(active.items, active.key)
    if (chain && chain.some((k) => !openGroups[k])) {
      setOpenGroups(Object.fromEntries(chain.map((k) => [k, true])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, location.pathname])

  // Accordion: opening groupKey closes every OTHER currently-open key that
  // shares its immediate parent (a true sibling), while leaving ancestors,
  // descendants, and unrelated branches untouched — derived by comparing
  // each open key's own parent segment (everything before its last `>`)
  // against this groupKey's parentKey, not by depth (see SidebarNavItem).
  function toggleGroup(groupKey: string, parentKey: string) {
    setOpenGroups((prev) => {
      const wasOpen = Boolean(prev[groupKey])
      const next: Record<string, boolean> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (!v) continue
        const kParent = k.slice(0, k.lastIndexOf('>'))
        if (kParent === parentKey) continue
        next[k] = v
      }
      if (!wasOpen) next[groupKey] = true
      return next
    })
  }

  // Pinned-open (`open` prop, toggled by Navbar's collapse button) keeps the
  // flyout in normal flex flow, pushing <main> over. When collapsed,
  // hovering the rail temporarily reveals the same flyout as a floating
  // overlay instead (so it doesn't reflow page content on every hover), and
  // hides it again on mouse-leave — the "expand and shrink on hover" behavior.
  const expanded = open || hovering

  return (
    <div className="relative flex h-full shrink-0 bg-rail-bg" onMouseEnter={() => !open && setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <aside className={`${RAIL_WIDTH_CLASS} bg-rail-bg h-full overflow-hidden flex flex-col items-center`}>
        <div className="soft-scrollbar flex w-full flex-col items-center gap-1 overflow-y-auto overflow-x-hidden py-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = section.key === activeKey
          return (
            <button
              key={section.key}
              type="button"
              title={section.label}
              onClick={() => {
                setActiveKey(section.key)
                setOpenGroups({})
                setHoverGroup(new Set())
                if (!open && onOpen) onOpen()
                if (section.items.length === 0 && EMPTY_SECTION_HOME_PATH[section.key]) navigate(EMPTY_SECTION_HOME_PATH[section.key])
              }}
              className={`cursor-pointer group/rail flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] leading-3 transition-colors ${
                isActive ? 'text-brand' : 'text-text-faint hover:text-brand'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                isActive ? 'bg-brand text-white shadow-md shadow-brand/25' : 'group-hover/rail:bg-brand/10'
              }`}>
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span className="w-full truncate text-center">{section.label}</span>
            </button>
          )
        })}
        </div>
      </aside>

      <div
        className={`h-full flex flex-col bg-surface border border-border overflow-y-auto scroll-smooth [scrollbar-width:none] transition-all duration-300 ease-in-out translate-x-0 z-[1] rounded-tl-2xl ${
          open ? 'relative w-64 flex-1' : `absolute ${RAIL_WIDTH_OFFSET_CLASS} top-0 z-30 shadow-xl ${expanded ? 'w-64' : 'w-0'}`
        }`}
        onMouseEnter={() => !open && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="soft-scrollbar w-64 h-full overflow-y-auto overflow-x-hidden px-4 pb-5">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-surface pt-4 pb-3">
            <span className="text-sm font-bold tracking-wide text-brand uppercase">{active.label}</span>
            <button type="button" onClick={onClose} title="Close menu" className="p-1 rounded-md text-text hover:bg-surface-alt">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="space-y-0">
            {active.items.length === 0 && <p className="text-xs italic text-text-muted px-2 py-1">Nothing here yet.</p>}
            {active.items.map((item, i) => (
              <SidebarNavItem
                key={`${item.label}-${i}`}
                item={item}
                depth={0}
                parentKey={active.key}
                navigate={navigate}
                location={location}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                hoverGroup={hoverGroup}
                setHoverGroup={setHoverGroup}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
