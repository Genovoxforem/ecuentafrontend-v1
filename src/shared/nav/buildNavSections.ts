import type { LucideIcon } from 'lucide-react'
import type { NavItem, NavSection } from '../../features/navTypes'
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
  hotel: 'kitchen',
  booking: 'kitchen',
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

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ')
}

function flattenPaths(internalKey: string, items: NavItem[], out: Map<string, string>) {
  for (const item of items) {
    if ('path' in item && item.path) out.set(`${internalKey}::${normalizeLabel(item.label)}`, item.path)
    if ('items' in item && item.items) flattenPaths(internalKey, item.items, out)
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

function mapNode(internalKey: string, node: BackendMenuNode, pathIndex: Map<string, string>): NavItem {
  const path = pathIndex.get(`${internalKey}::${normalizeLabel(node.titre)}`)
  if (node.children.length > 0) {
    // `path` carries through even though this node also has children — a
    // real node can be both (see NavGroupItem's own comment). Dropping it
    // here previously made a node like Agenda's "Events" (link to the bare
    // calendar AND parent of New Event/List/Calendar/Reporting/Tags) resolve
    // to no path at all, breaking both its breadcrumb and its own direct
    // link once real backend data replaced the flat local fallback tree.
    return { label: node.titre, path, items: node.children.map((child) => mapNode(internalKey, child, pathIndex)) }
  }
  return { label: node.titre, path }
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
    // into any of them.
    const items =
      tree.length === 0 && FALLBACK_TO_LOCAL_NAV_KEYS.has(internalKey) && existing
        ? existing.items
        : tree.map((node) => mapNode(internalKey, node, pathIndex))
    return {
      key: internalKey,
      label: existing?.label ?? tm.title,
      icon: existing?.icon ?? fallbackIcon,
      items,
    }
  })
}
