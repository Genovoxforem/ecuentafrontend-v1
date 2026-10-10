import type { LucideIcon } from 'lucide-react'
import type { NavItem, NavSection } from '../../features/navTypes'
import { resolveLegacyRoute } from '../legacyRoute'
import { underConstructionPath } from './underConstruction'
import type { AppMenuResponse, BackendMenuNode } from './appMenu.queries'

// Maps this backend's real llx_menu.mainmenu key (as returned by GET
// /api/menu/) to the internal section key our hand-built *.nav.ts files
// already use. Those files are kept as-is and used only as a label->path
// lookup now (built and verified while each real page was ported this
// session) — the section list itself, its order, and its item hierarchy
// all come from the live backend response, not from this table or those
// files. Any real top-level menu key with no entry here (e.g. a module we
// haven't built any pages for yet, like Budget or Members) still renders,
// just with an unmapped icon and every leaf unlinked.
//
// Keys are lowercased before lookup (see MAINMENU_TO_INTERNAL_KEY_LOWER
// below) so that case variations in the backend's llx_menu.mainmenu field
// (e.g. 'Ap' vs 'ap', 'Kitchen' vs 'kitchen') don't cause a miss.
const MAINMENU_TO_INTERNAL_KEY: Record<string, string> = {
  dashboard: 'home',
  home: 'home',
  zra: 'zra',
  accountsreceivable: 'sales',
  ap: 'purchases',
  productinformation: 'products',
  inventwarehouse: 'warehouses',
  projectmanagement: 'projects',
  projects: 'projects',
  cashmanagement: 'banking',
  bank: 'banking',
  employee: 'users',
  users: 'users',
  payroll: 'payroll',
  kitchen: 'kitchen',
  asset: 'fixed-asset',
  fixedasset: 'fixed-asset',
  generalledger: 'general-ledger',
  ticket: 'ticket',
  administartor: 'administrator',
  administrator: 'administrator',
  admin: 'administrator',
  reports: 'reports',
  expences: 'expenses',
  expenses: 'expenses',
  commercial: 'sales',
  companies: 'sales',
  hotel: 'hotel',
  booking: 'kitchen',
  supplement: 'supplement',
  budget: 'budget',
  members: 'members',
}

// Pre-lowercased version for case-insensitive lookup.
const MAINMENU_TO_INTERNAL_KEY_LOWER: Record<string, string> = {}
for (const [k, v] of Object.entries(MAINMENU_TO_INTERNAL_KEY)) {
  MAINMENU_TO_INTERNAL_KEY_LOWER[k.toLowerCase()] = v
}

// Opt-in exception to the "always trust the live backend tree" rule below:
// expenses/list.php has zero child rows in llx_menu at all (confirmed by
// reading core/menus/ecumenu/expences-link.php directly — see
// expenses.nav.ts's own header comment), not a module this app simply
// hasn't built pages for. Every one of its 12 local nav items is a real,
// already-verified route, so an empty backend tree here means "the sidebar
// has nothing to show," not "these pages don't exist" — worth falling back
// to the hand-built list instead of leaving the section permanently empty.
// Members/Reports are deliberately NOT in this set: their empty tree really
// does mean no pages exist yet for them.
const FALLBACK_TO_LOCAL_NAV_KEYS = new Set(['expenses'])

// Sections whose live backend rows are FLAT: every row has fk_menu=-1, so the
// backend carries no grouping to rebuild (confirmed live on 172.16.5.10 for
// ZRA's ASYCUDA/Sales/Customer/Purchase/... headings and Ticket's list; Hotel
// and Payroll have the same shape on installs that expose them). For these,
// the hand-built *.nav.ts file supplies only the NESTING and the React paths —
// what is shown is limited to the items the backend lists (and lists as enabled
// and permitted for this user): a local item the backend does not return is
// dropped, and a backend item with no local page is added as an unlinked entry
// (the same way every other section shows one). Same tradeoff as before for the
// grouping itself: it is the local structure, not a live one.
const LOCAL_STRUCTURE_NAV_KEYS = new Set(['hotel', 'payroll', 'zra', 'ticket'])

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ')
}

function collectBackendNodes(tree: BackendMenuNode[], out: BackendMenuNode[] = []): BackendMenuNode[] {
  for (const node of tree) {
    out.push(node)
    collectBackendNodes(node.children, out)
  }
  return out
}

// Keeps only the local items whose label the backend lists. A group stays when
// something under it stays (it is just the container), or when the backend
// lists the group itself and it is a page of its own.
export function pruneToBackendLabels(items: NavItem[], allowed: ReadonlySet<string>): NavItem[] {
  const out: NavItem[] = []
  for (const item of items) {
    const listed = allowed.has(normalizeLabel(item.label))
    if ('items' in item && item.items) {
      const kept = pruneToBackendLabels(item.items, allowed)
      if (kept.length > 0 || (listed && item.path)) out.push({ ...item, items: kept })
    } else if (listed) {
      out.push(item)
    }
  }
  return out
}

function labelsOf(items: NavItem[], out = new Set<string>()): Set<string> {
  for (const item of items) {
    out.add(normalizeLabel(item.label))
    if ('items' in item && item.items) labelsOf(item.items, out)
  }
  return out
}

// What a flat section shows: the local structure limited to the backend's own
// list, then any backend item the local file has no page for.
function localStructureLimitedToBackend(sectionKey: string, local: NavItem[], tree: BackendMenuNode[]): NavItem[] {
  const nodes = collectBackendNodes(tree)
  const allowed = new Set(nodes.map((n) => normalizeLabel(n.titre)))
  const kept = pruneToBackendLabels(local, allowed)
  const shown = labelsOf(kept)
  const extra: NavItem[] = nodes.filter((n) => !shown.has(normalizeLabel(n.titre))).map((n) => ({ label: n.titre, path: resolveLegacyRoute(n.url) ?? underConstructionPath(sectionKey, n.titre) }))
  return [...kept, ...extra]
}

// `ancestors` is the chain of parent labels above `items` (empty at the
// section root). Every path gets indexed twice: once under a composite key
// that includes its full ancestor chain (so a repeated leaf label like
// "ToDispatch" under 3 different parents — General Ledger's Customer/Vendor/
// Expense-report invoice binding all real, different pages — resolves to the
// right one), and once under the old flat leaf-only key (so every other
// already-working *.nav.ts file, none of which has this kind of collision,
// keeps matching exactly as before). mapNode below tries the composite key
// first and falls back to the flat one.
function flattenPaths(internalKey: string, items: NavItem[], out: Map<string, string>, ancestors: string[] = []) {
  for (const item of items) {
    if ('path' in item && item.path) {
      out.set(`${internalKey}::${normalizeLabel(item.label)}`, item.path)
      if (ancestors.length > 0) {
        const composite = [...ancestors, item.label].map(normalizeLabel).join('>')
        out.set(`${internalKey}::${composite}`, item.path)
      }
    }
    if ('items' in item && item.items) flattenPaths(internalKey, item.items, out, [...ancestors, item.label])
  }
}

// A real page can appear more than once in the real menu under the same
// mainmenu (e.g. "Customer" as a group header AND "Customer Info" as its
// own leaf, both pointing at customer.php) — building this index once per
// render, keyed by internal section, is what lets a plain label match find
// the right already-verified React path regardless of how the real tree
// nests it.
function buildPathIndex(existingSections: NavSection[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const section of existingSections) flattenPaths(section.key, section.items, index)
  return index
}

function mapNode(internalKey: string, node: BackendMenuNode, pathIndex: Map<string, string>, ancestors: string[] = []): NavItem {
  // Try the full-ancestor-chain composite key first — needed for real menus
  // where the same leaf label repeats under different parents (see
  // flattenPaths' own comment) — then fall back to the flat leaf-only key
  // every other module's nav file already relies on.
  const composite = ancestors.length > 0 ? [...ancestors, node.titre].map(normalizeLabel).join('>') : null
  // The label match first; when the backend names the item differently from the
  // local nav file (Kitchen's "Home" is the local "Kitchen Dashboard", and the
  // payroll menu sits under a different key), the item's own legacy URL decides.
  const path =
    (composite && pathIndex.get(`${internalKey}::${composite}`)) ?? pathIndex.get(`${internalKey}::${normalizeLabel(node.titre)}`) ?? resolveLegacyRoute(node.url) ?? undefined
  if (node.children.length > 0) {
    // `path` carries through even though this node also has children — a
    // real node can be both (see NavGroupItem's own comment). Dropping it
    // here previously made a node like Agenda's "Events" (link to the bare
    // calendar AND parent of New Event/List/Calendar/Reporting/Tags) resolve
    // to no path at all, breaking both its breadcrumb and its own direct
    // link once real backend data replaced the flat local fallback tree.
    const nextAncestors = [...ancestors, node.titre]
    return { label: node.titre, path, items: node.children.map((child) => mapNode(internalKey, child, pathIndex, nextAncestors)) }
  }
  // A backend item with no React page opens the "Under construction" page, so a
  // menu item the backend adds later shows up and is clickable right away.
  return { label: node.titre, path: path ?? underConstructionPath(internalKey, node.titre) }
}

export function buildNavSections(menu: AppMenuResponse, existingSections: NavSection[], fallbackIcon: LucideIcon): NavSection[] {
  const pathIndex = buildPathIndex(existingSections)
  const existingByKey = new Map(existingSections.map((s) => [s.key, s]))

  return menu.topMenus.map((tm) => {
    const internalKey = MAINMENU_TO_INTERNAL_KEY_LOWER[tm.key.toLowerCase()] ?? tm.key
    const existing = existingByKey.get(internalKey)
    const tree = menu.sections[tm.key] ?? []
    // Some real top-level icons (Members, Reports) have a genuinely empty
    // backend menu tree — confirmed via both llx_menu and the modules' own
    // PHP descriptors, not a module we simply haven't built pages for. No
    // fallback to the local *.nav.ts list here: this stays strictly driven
    // by the live backend response, even though every item in those files
    // is a real, already-verified page — the sidebar should reflect what
    // this instance's actual menu contains, not a hand-assembled list.
    //
    // Expenses is the one deliberate exception (see
    // FALLBACK_TO_LOCAL_NAV_KEYS above) — without this, every one of its 12
    // real pages was reachable only by typing the URL directly; the sidebar
    // section itself rendered as "Nothing here yet." with no way to click
    // into any of them. The flat sections (LOCAL_STRUCTURE_NAV_KEYS) are a
    // second, separate case — see that set's own comment.
    // - Expenses: its left menu is built in PHP, not from the menu table, so the
    //   backend tree is empty while the top-level entry is present — the module
    //   being listed is the only signal, and its fixed list is shown.
    // - Flat sections (ZRA, Ticket, …): local nesting limited to what the backend lists.
    // - Everything else: the backend tree itself.
    const items =
      existing && tree.length === 0 && FALLBACK_TO_LOCAL_NAV_KEYS.has(internalKey)
        ? existing.items
        : existing && LOCAL_STRUCTURE_NAV_KEYS.has(internalKey)
          ? localStructureLimitedToBackend(internalKey, existing.items, tree)
          : tree.map((node) => mapNode(internalKey, node, pathIndex))
    return {
      key: internalKey,
      label: existing?.label ?? tm.title,
      icon: existing?.icon ?? fallbackIcon,
      items,
    }
  })
}
