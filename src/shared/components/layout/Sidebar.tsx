import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, type NavigateFunction, type Location } from 'react-router-dom'
import { LayoutGrid, Plus, X, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { NavItem, NavLeafItem } from '../../../features/navTypes'
import { useAppMenu } from '../../nav/appMenu.queries'
import { buildNavSections } from '../../nav/buildNavSections'
import { PATH_SOURCE_SECTIONS, EMPTY_SECTION_HOME_PATH } from '../../nav/pathSourceSections'
import { prefetchRoute } from '../../../app/routePrefetch'
import { useTheme } from '../../../context/ThemeContext'
import { getNavItemIcon, getNavItemIconTileClass } from '../../nav/getNavItemIcon'

// Kept as one pair so the rail's width and the collapsed flyout's left-offset
// (which must butt up against the rail) can never drift out of sync.
const RAIL_WIDTH_CLASS = 'w-[72px]'
const RAIL_WIDTH_OFFSET_CLASS = 'left-[72px]'

// "Soft view": leaf items get a gentler, slower hover than a flat bg-swap —
// a soft tint + a barely-there rightward nudge + soft shadow, eased over a
// longer duration so the flyout feels calm rather than snappy.
// A real backend menu can legitimately list the same real page twice at one
// sibling level — a category heading whose own click target duplicates a
// more specific sibling below it (Payroll's flat "Human Resource"/"All
// Leave Request" pair is the confirmed live case: both resolve to the same
// path). Without this, every sibling sharing that path independently
// satisfies its own `currentUrl === item.path` check and all light up
// together on one click. Only the LAST item at a given path (the more
// specific one, listed after its heading) keeps the "you are here"
// indicator; earlier siblings at the same path are suppressed.
function computeSuppressedIndices(items: NavItem[]): Set<number> {
  const lastIndexForPath = new Map<string, number>()
  items.forEach((it, i) => {
    if (it.path) lastIndexForPath.set(it.path, i)
  })
  const suppressed = new Set<number>()
  items.forEach((it, i) => {
    if (it.path && lastIndexForPath.get(it.path) !== i) suppressed.add(i)
  })
  return suppressed
}

function pathMatchesLocation(path: string | undefined, pathname: string, currentSearch: string): boolean {
  if (!path) return false
  const queryIndex = path.indexOf('?')
  const itemPathname = queryIndex < 0 ? path : path.slice(0, queryIndex)
  const search = queryIndex < 0 ? '' : path.slice(queryIndex)
  return pathname === itemPathname && (!search || currentSearch === search)
}

function filterNavItems(items: NavItem[], query: string): NavItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return items
  return items.reduce<NavItem[]>((matches, item) => {
    if ('items' in item && item.items) {
      const children = filterNavItems(item.items, normalizedQuery)
      if (item.label.toLowerCase().includes(normalizedQuery)) matches.push(item)
      else if (children.length > 0) matches.push({ ...item, items: children })
    } else if (item.label.toLowerCase().includes(normalizedQuery)) {
      matches.push(item)
    }
    return matches
  }, [])
}

function sectionSubtitle(sectionKey: string): string {
  const descriptions: Record<string, string> = {
    home: 'Dashboards & Overview',
    zra: 'Tax & Invoice Management',
    sales: 'Customers, Orders & Invoices',
    purchases: 'Purchasing & Suppliers',
    products: 'Products & Services',
    warehouses: 'Inventory & Stock Control',
    projects: 'Projects & Operations',
    banking: 'Accounts & Transactions',
    'general-ledger': 'Accounting & Reports',
    users: 'People & Administration',
    payroll: 'Employees & Payroll',
  }
  return descriptions[sectionKey] ?? 'Business Management'
}

function SidebarLeaf({ item, depth, navigate, location, blueMetal, suppressCurrent = false }: { item: NavLeafItem; depth: number; navigate: NavigateFunction; location: Location; blueMetal: boolean; suppressCurrent?: boolean }) {
  const isLink = Boolean(item.path)
  // Some real nav items (e.g. Agenda's 4 status/scope-filtered "List"/
  // "Calendar" links — see users.nav.ts) carry a query string as part of
  // their own `path`, all pointing at the same route. Comparing against
  // `location.pathname` alone can never match those — it never includes
  // the search string — which left every one of them permanently "loading"
  // (the reset effect's condition never became true) and never highlighted
  // as current even while actually on that exact filtered page.
  const isCurrent = isLink && pathMatchesLocation(item.path, location.pathname, location.search) && !suppressCurrent
  const ItemIcon = getNavItemIcon(item.label)
  const isImportantAsycudaImport = /import\s*\(\s*asycuda\s*\)/i.test(item.label)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (loading && pathMatchesLocation(item.path, location.pathname, location.search)) setLoading(false)
  }, [location.pathname, location.search, loading, item.path])

  return (
    <button
      type="button"
      disabled={!isLink || loading}
      onClick={
        isLink
          ? () => {
              setLoading(true)
              navigate(item.path!)
            }
          : undefined
      }
      onMouseEnter={isLink ? () => prefetchRoute(item.path!) : undefined}
      style={{ paddingLeft: `${depth * 1 + 1}rem` }}
      className={
        blueMetal
          ? `group w-full min-h-8 flex items-center gap-2.5 text-left ${blueMetal && isImportantAsycudaImport ? 'py-2.5 pr-3.5' : 'py-2 pr-3'} rounded-md text-sm leading-5 transition-colors ${
              isCurrent ? 'bg-brand/12 text-brand font-semibold shadow-sm ring-1 ring-brand/20' : isLink ? 'text-text-muted hover:text-brand hover:bg-brand/8 cursor-pointer' : 'text-text-faint cursor-default'
            }`
          : `w-full flex items-start gap-2 text-left py-2 pr-3 rounded-md text-[13px] leading-4 transition-colors ${
              isCurrent ? 'text-brand font-semibold' : isLink ? 'text-text-muted hover:text-brand hover:bg-brand/5 cursor-pointer' : 'text-text-faint cursor-default'
            }`
      }
    >
      {loading ? (
        <Loader2 size={10} className="mt-1 shrink-0 animate-spin text-brand" />
      ) : (
        blueMetal ? (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${getNavItemIconTileClass(item.label)} ${isCurrent ? 'ring-2 ring-brand/60' : 'group-hover:ring-brand/50'}`}>
            <ItemIcon size={14} strokeWidth={2} />
          </span>
        ) : (
          <span className={`mt-1 w-1.5 h-1.5 border shrink-0 ${isCurrent ? 'border-brand bg-brand' : 'border-text-faint'}`} />
        )
      )}
      <span className="min-w-0 truncate">{item.label}</span>
      {blueMetal && isLink && <ChevronRight size={13} className={`ml-auto shrink-0 ${isCurrent ? 'text-brand' : 'text-text-faint/60'}`} />}
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
  blueMetal,
  forceOpen = false,
  suppressCurrent = false,
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
  blueMetal: boolean
  forceOpen?: boolean
  suppressCurrent?: boolean
}) {
  if (!('items' in item) || !item.items) {
    return <SidebarLeaf item={item} depth={depth} navigate={navigate} location={location} blueMetal={blueMetal} suppressCurrent={suppressCurrent} />
  }
  // Full ancestor path, not just depth — depth alone can't tell two
  // same-depth groups under different parents apart, which would make the
  // accordion incorrectly close a group in an unrelated branch.
  const groupKey = `${parentKey}>${item.label}`
  const isPinned = Boolean(openGroups[groupKey])
  // Top-level groups used to always render open (an unconditional `depth
  // === 0` term here), which defeated the accordion entirely for any
  // section with several top-level groups (e.g. ZRA's ASYCUDA/Sales/
  // Customer/Purchase/Item Info all showing expanded at once no matter what
  // was clicked). They now behave like every other depth: closed until
  // pinned open (click) or previewed (hover/search).
  const isOpen = isPinned || hoverGroup.has(groupKey) || (blueMetal && forceOpen)
  // A group can also be a real page (e.g. Payroll's "Human Resource" —
  // matches the legacy menu, where clicking that parent node lands on its
  // Holiday Management/All Leave Request page). currentUrl mirrors
  // SidebarLeaf's own comment: compared with the search string included
  // since a group's path can carry one too.
  const hasActiveDescendant = item.items.some((sub) => itemContainsPath(sub, location))
  const isCurrent = pathMatchesLocation(item.path, location.pathname, location.search) && !suppressCurrent
  const isActive = isCurrent || hasActiveDescendant
  const ItemIcon = getNavItemIcon(item.label)
  // Not memoized: item.items is small (a handful of sidebar rows) and this
  // component is already an early-return above hooks, so a useMemo here
  // would run conditionally and violate the Rules of Hooks.
  const childSuppressed = computeSuppressedIndices(item.items)
  return (
    <div
      className="pt-1 first:pt-0"
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
          onClick={() => {
            if (item.path) {
              navigate(item.path)
              if (!isPinned) toggleGroup(groupKey, parentKey)
            } else {
              toggleGroup(groupKey, parentKey)
            }
          }}
          onMouseEnter={item.path ? () => prefetchRoute(item.path!) : undefined}
          style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
          className={
            blueMetal
              ? `flex-1 min-w-0 flex items-center gap-2 text-left py-2 rounded-md transition-colors ${depth === 0 ? 'text-[11px] font-bold uppercase tracking-wide' : 'text-sm font-semibold'} ${isActive ? 'bg-brand/12 text-brand shadow-sm ring-1 ring-brand/20' : isPinned ? 'text-brand' : 'text-text-muted hover:bg-brand/8 hover:text-brand'}`
              : `flex-1 min-w-0 text-left py-2 rounded-md text-[13px] font-semibold transition-colors ${isCurrent || isPinned ? 'text-brand' : 'text-text-muted hover:text-text'}`
          }
        >
          {blueMetal && (
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${getNavItemIconTileClass(item.label)} ${isActive ? 'ring-2 ring-brand/60' : ''}`}>
              <ItemIcon size={14} strokeWidth={2} />
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleGroup(groupKey, parentKey)}
          title={`${isOpen ? 'Collapse' : 'Expand'} ${item.label}`}
          className={blueMetal ? `flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-brand/10 hover:text-brand ${isOpen ? 'text-brand' : ''}` : `flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? 'bg-brand text-white' : 'bg-brand/90 text-white hover:bg-brand'}`}
        >
          {blueMetal ? <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} /> : <Plus size={11} strokeWidth={3} className={`transition-transform ${isOpen ? 'rotate-45' : ''}`} />}
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-0.5">
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
              blueMetal={blueMetal}
              suppressCurrent={childSuppressed.has(i)}
              forceOpen={forceOpen}
            />
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function itemContainsPath(item: NavItem, location: Location): boolean {
  if ('items' in item) return pathMatchesLocation(item.path, location.pathname, location.search) || item.items.some((sub) => itemContainsPath(sub, location))
  return pathMatchesLocation(item.path, location.pathname, location.search)
}

export function Sidebar({ open = true, onClose, onOpen }: { open?: boolean; onClose?: () => void; onOpen?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const { data: menu } = useAppMenu()
  const blueMetal = theme === 'blue-metal'
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
  const [menuSearch, setMenuSearch] = useState('')
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
  const ActiveIcon = active.icon
  const visibleItems = useMemo(() => filterNavItems(active.items, blueMetal ? menuSearch : ''), [active.items, blueMetal, menuSearch])
  const activeSuppressed = useMemo(() => computeSuppressedIndices(visibleItems), [visibleItems])

  // Sync activeKey to the current route's section — but ONLY when the route
  // changes (location.pathname) or the menu data loads (SECTIONS), never when
  // activeKey itself changes. Without excluding activeKey from the deps, this
  // effect fires every time the user clicks a rail icon (which sets
  // activeKey), immediately overriding their selection back to whatever
  // section holds the current page — so the flyout panel never shows the
  // clicked section's children.
  useEffect(() => {
    // A ledger detail page (a transaction, an account card) is not a menu item of its own, but it
    // belongs to General Ledger — also when the page is opened by its address.
    const currentSection =
      SECTIONS.find((section) => section.items.some((item) => itemContainsPath(item, location))) ??
      (location.pathname.startsWith('/ledger/') ? SECTIONS.find((section) => section.key === 'general-ledger') : undefined) ??
      // Same for an expense's own card (/expenses/card/:id), which is opened from the Expenses pages.
      (location.pathname.startsWith('/expenses/card/') ? SECTIONS.find((section) => section.key === 'expenses') : undefined)
    if (currentSection) setActiveKey(currentSection.key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SECTIONS, location.pathname, location.search])

  // Whichever chain of groups holds the current page gets pinned open (same
  // as clicking each header down the chain) — covers both clicking a
  // sub-menu link (which navigates here) and landing on a URL directly, so
  // the active item is never hidden inside a collapsed group at any depth.
  useEffect(() => {
    function findOpenChain(items: NavItem[], parentKey: string): string[] | null {
      for (const item of items) {
        if (!('items' in item) || !item.items) continue
        if (itemContainsPath(item, location)) {
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
  }, [active, location.pathname, location.search])

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

  // Both pinned-open and hover-expanded states reserve the flyout width in
  // flex flow so the navigation never covers page content. Hover expansion
  // remains temporary and returns to the icon rail on mouse-leave.
  const expanded = open || hovering

  return (
    <div className={`relative flex h-full shrink-0 bg-rail-bg transition-[width] duration-300 ease-in-out ${expanded ? 'w-[328px]' : RAIL_WIDTH_CLASS}`} onMouseEnter={() => !open && setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <aside className={`${RAIL_WIDTH_CLASS} bg-rail-bg h-full overflow-hidden flex flex-col items-center`}>
        {/* <div className="soft-scrollbar flex w-full flex-col items-center gap-1 overflow-y-auto overflow-x-hidden py-2"> */}
          <div className="flex w-full flex-col items-center gap-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = section.key === activeKey
            const isBlueMetal = theme === 'blue-metal'
            return (
              <button
                key={section.key}
                type="button"
                title={section.label}
                onClick={() => {
                  setActiveKey(section.key)
                  setMenuSearch('')
                  setOpenGroups({})
                  setHoverGroup(new Set())
                  if (!open && onOpen) onOpen()
                  if (section.items.length === 0 && EMPTY_SECTION_HOME_PATH[section.key]) navigate(EMPTY_SECTION_HOME_PATH[section.key])
                }}
                className={`cursor-pointer group/rail flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] leading-3 transition-colors ${
                  isActive ? 'text-brand' : 'text-text-faint hover:text-brand'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                    isBlueMetal
                      ? isActive
                        ? 'border-[#66caff] bg-[linear-gradient(145deg,#2aa9ff,#0754a5)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_16px_rgba(22,139,255,0.55)]'
                        : 'border-[#2b6e9f] bg-[linear-gradient(145deg,#173958,#091522)] text-[#6acfff] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_10px_rgba(22,139,255,0.18)]'
                      : isActive
                        ? 'border-transparent bg-brand text-white shadow-md shadow-brand/25'
                        : 'border-transparent group-hover/rail:bg-brand/10'
                  }`}
                >
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
          expanded ? 'relative w-64 flex-1' : `absolute ${RAIL_WIDTH_OFFSET_CLASS} top-0 w-0`
        }`}
        onMouseEnter={() => !open && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="soft-scrollbar w-64 h-full overflow-y-auto overflow-x-hidden px-4 pb-5">
          <div className={`sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface ${blueMetal ? 'px-2 pt-4 pb-3' : 'pt-4 pb-3'}`}>
            {blueMetal ? (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand shadow-sm">
                  <ActiveIcon size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold text-text">{active.label}</h2>
                  <p className="truncate text-[11px] text-text-faint">{sectionSubtitle(active.key)}</p>
                </div>
              </>
            ) : (
              <span className="flex-1 text-sm font-bold tracking-wide text-brand uppercase">{active.label}</span>
            )}
            <button type="button" onClick={onClose} title="Close menu" className="p-1 rounded-md text-text hover:bg-surface-alt">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          {blueMetal && (
            <label className="relative mt-3 mb-2 block">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                placeholder="Search menu..."
                aria-label={`Search ${active.label} menu`}
                className="h-9 w-full rounded-md border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
          )}
          <div className="space-y-0.5">
            {active.items.length === 0 && <p className="px-2 py-2 text-xs italic text-text-muted">Nothing here yet.</p>}
            {active.items.length > 0 && visibleItems.length === 0 && <p className="px-2 py-2 text-xs text-text-faint">No matching menu items.</p>}
            {visibleItems.map((item, i) => (
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
                forceOpen={blueMetal && Boolean(menuSearch.trim())}
                blueMetal={blueMetal}
                suppressCurrent={activeSuppressed.has(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
