import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, type NavigateFunction, type Location } from 'react-router-dom'
import { LayoutGrid, Plus, ChevronDown } from 'lucide-react'
import type { NavItem, NavLeafItem } from '../../../features/navTypes'
import { useAppMenu } from '../../nav/appMenu.queries'
import { buildNavSections } from '../../nav/buildNavSections'
import { PATH_SOURCE_SECTIONS, EMPTY_SECTION_HOME_PATH } from '../../nav/pathSourceSections'

// Kept as one pair so the rail's width and the collapsed flyout's left-offset
// (which must butt up against the rail) can never drift out of sync.
const RAIL_WIDTH_CLASS = 'w-14'
const RAIL_WIDTH_OFFSET_CLASS = 'left-14'

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
  return (
    <button
      type="button"
      disabled={!isLink}
      onClick={isLink ? () => navigate(item.path!) : undefined}
      style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
      className={`w-full flex items-center gap-2 text-left py-1 pr-2 rounded-lg text-sm transition-all duration-300 ease-out ${
        isCurrent
          ? 'bg-brand/10 text-brand font-semibold shadow-sm'
          : isLink
            ? 'text-text-muted hover:bg-surface-alt/70 hover:text-text hover:translate-x-0.5 hover:shadow-sm cursor-pointer'
            : 'text-text-faint cursor-default'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ${isCurrent ? 'bg-brand' : 'bg-transparent'}`} />
      {item.label}
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
  const isOpen = isPinned || hoverGroup.has(groupKey)
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
      <button
        type="button"
        onClick={() => toggleGroup(groupKey, parentKey)}
        style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
        className={`w-full flex items-center justify-between pr-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${
          isPinned ? 'text-brand' : 'text-text-muted hover:text-text'
        }`}
      >
        <span>{item.label}</span>
        <ChevronDown size={13} strokeWidth={2.5} className={`shrink-0 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
      </button>
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

export function Sidebar({ open = true }: { open?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: menu } = useAppMenu()
  // GET /api/menu/'s real backend response drives the section list itself;
  // PATH_SOURCE_SECTIONS only supplies each real label's already-verified
  // React path (see buildNavSections) and covers the one frame before the
  // request resolves.
  const SECTIONS = useMemo(() => (menu ? buildNavSections(menu, PATH_SOURCE_SECTIONS, LayoutGrid) : PATH_SOURCE_SECTIONS), [menu])
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
    <div className="relative flex h-full shrink-0" onMouseEnter={() => !open && setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <aside className={`${RAIL_WIDTH_CLASS} bg-rail-bg h-full overflow-hidden flex flex-col items-center border-r border-black/10 dark:border-white/10`}>
        <div className="flex flex-col items-center gap-0.5 pt-1 pb-10">
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
                if (section.items.length === 0 && EMPTY_SECTION_HOME_PATH[section.key]) navigate(EMPTY_SECTION_HOME_PATH[section.key])
              }}
              onMouseEnter={() => setActiveKey(section.key)}
              className={`group/rail relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isActive ? 'bg-brand text-white shadow-sm shadow-brand/40' : 'text-text hover:bg-surface hover:text-(--color-accent-teal-2) hover:-translate-y-0.5'
              }`}
            >
              <Icon
                size={22}
                className={
                  isActive
                    ? '[filter:drop-shadow(0_0_6px_var(--color-accent-teal-2))_drop-shadow(0_0_10px_var(--color-accent-cyan-2))]'
                    : 'group-hover/rail:[filter:drop-shadow(0_0_5px_var(--color-accent-teal-2))_drop-shadow(0_0_9px_var(--color-accent-cyan-2))]'
                }
              />
            </button>
          )
        })}
        </div>
      </aside>

      <div
        className={`h-full bg-rail-bg border-r border-border overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'relative w-52' : `absolute ${RAIL_WIDTH_OFFSET_CLASS} top-0 z-30 shadow-xl ${expanded ? 'w-52' : 'w-0'}`
        }`}
        onMouseEnter={() => !open && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="soft-scrollbar w-52 h-full overflow-y-auto overflow-x-hidden pt-9 pb-4 px-3">
          <div className="flex items-center justify-between mb-2 px-1 pb-2 border-b border-border">
            <span className="text-xs font-bold tracking-wide text-brand uppercase">{active.label}</span>
            <button type="button" title={`Add to ${active.label}`} className="p-1 rounded-md text-brand hover:bg-surface-alt">
              <Plus size={14} />
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
