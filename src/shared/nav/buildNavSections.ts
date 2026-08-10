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
const MAINMENU_TO_INTERNAL_KEY: Record<string, string> = {
  dashboard: 'home',
  zra: 'zra',
  accountsreceivable: 'sales',
  Ap: 'purchases',
  productinformation: 'products',
  inventwarehouse: 'warehouses',
  projectmanagement: 'projects',
  cashmanagement: 'banking',
  employee: 'users',
  payroll: 'payroll',
  Kitchen: 'kitchen',
  asset: 'fixed-asset',
  generalledger: 'general-ledger',
  ticket: 'ticket',
  administartor: 'administrator',
  reports: 'reports',
}

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
    return { label: node.titre, items: node.children.map((child) => mapNode(internalKey, child, pathIndex)) }
  }
  return { label: node.titre, path }
}

export function buildNavSections(menu: AppMenuResponse, existingSections: NavSection[], fallbackIcon: LucideIcon): NavSection[] {
  const pathIndex = buildPathIndex(existingSections)
  const existingByKey = new Map(existingSections.map((s) => [s.key, s]))

  return menu.topMenus.map((tm) => {
    const internalKey = MAINMENU_TO_INTERNAL_KEY[tm.key] ?? tm.key
    const existing = existingByKey.get(internalKey)
    const tree = menu.sections[tm.key] ?? []
    return {
      key: internalKey,
      label: existing?.label ?? tm.title,
      icon: existing?.icon ?? fallbackIcon,
      items: tree.map((node) => mapNode(internalKey, node, pathIndex)),
    }
  })
}
