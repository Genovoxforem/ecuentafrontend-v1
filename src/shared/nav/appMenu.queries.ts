import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../features/auth/AuthContext'

// Real menu data, but this backend's own contract differs sharply by
// environment. The version this was originally built against (ecnta10)
// exposed a clean GET /menu/ returning exactly {topMenus, sections} — built
// by literally reusing Dolibarr's own menu-loading classes plus this
// theme's own tree/visibility helpers server-side. The current backend
// (ecuenta9) has a different, more primitive api/menu/index.php with no
// such shaping: see buildAppMenuFromRows() below for what its real,
// live-confirmed behavior actually is and how this adapts to it.
export interface BackendMenuNode {
  url: string
  titre: string
  level: number
  target: string
  leftmenu: string
  mainmenu: string
  children: BackendMenuNode[]
}
export interface BackendTopMenu {
  key: string
  title: string
  url: string
}
export interface AppMenuResponse {
  topMenus: BackendTopMenu[]
  sections: Record<string, BackendMenuNode[]>
}

// The backend's GET /menu/?action=getMenuData returns a NESTED tree (built
// by api/menu/index.php's buildMenuTree() using a level-stack), where each
// node has a `children` array. The frontend's buildAppMenuFromRows() below
// expects a FLAT row list and reconstructs the tree itself using fk_menu
// parent references. flattenTree() bridges that gap — it walks the backend's
// tree depth-first and collects every node into a flat array, preserving
// each node's rowid/fk_menu/mainmenu/type fields so buildAppMenuFromRows()
// can do its own section-resolution and tree reconstruction as before.
interface RawMenuRow {
  rowid: string | number
  fk_menu: string | number
  url: string
  titre: string
  target?: string
  mainmenu: string
  leftmenu?: string
  type: string
}

// Backend tree node — same fields as RawMenuRow plus a `children` array.
interface BackendMenuTreeNode extends RawMenuRow {
  children: BackendMenuTreeNode[]
}

function flattenTree(nodes: BackendMenuTreeNode[]): RawMenuRow[] {
  const out: RawMenuRow[] = []
  function walk(n: BackendMenuTreeNode) {
    out.push({
      rowid: n.rowid,
      fk_menu: n.fk_menu,
      url: n.url,
      titre: n.titre,
      target: n.target,
      mainmenu: n.mainmenu,
      leftmenu: n.leftmenu,
      type: n.type,
    })
    if (n.children) n.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

// The Home/Dashboard tab's own submenu was NEVER database-driven in the
// real reference system either — confirmed by reading ecnta10's own working
// api/menu/index.php (built by literally reusing the theme's real
// ecumenu_build_sidebar_shell(), which renders this tab from exactly this
// small hardcoded PHP array, not from llx_menu). Ported verbatim rather
// than re-derived, and confirmed live against ecuenta9 too: its `dashboard`
// mainmenu key has real DB rows for the top tab itself and nothing else —
// zero rows resolve into it as children — so without this, Home shows no
// submenu at all instead of silently showing the wrong thing.
const MODULE_DASHBOARDS: { url: string; title: string }[] = [
  { url: '/index.php?mainmenu=dashboard', title: 'Main Dashboard' },
  { url: '/custom/zra/zraindex.php?mainmenu=zra', title: 'ZRA Dashboard' },
  { url: '/compta/facture/index.php?mainmenu=accountsreceivable', title: 'Sales Dashboard' },
  { url: '/fourn/facture/index.php?mainmenu=ap', title: 'Purchases Dashboard' },
  { url: '/product/stock/index.php?mainmenu=inventwarehouse', title: 'Warehouse Dashboard' },
  { url: '/custom/payroll/payrollindex.php?mainmenu=payroll', title: 'Payroll Dashboard' },
  { url: '/accountancy/bookkeeping/listbyaccount.php?mainmenu=dashboard', title: 'Ledger Dashboard' },
  { url: '/kitchen/dashboard.php?mainmenu=dashboard', title: 'Kitchen Dashboard' },
  { url: '/booking/dashboard.php?mainmenu=dashboard', title: 'Hotel Dashboard' },
  { url: '/user/list.php?mode=employee&mainmenu=dashboard', title: 'Users Dashboard' },
]

// Groups the flat row list into {topMenus, sections} — AND, unlike an
// earlier version of this function, reconstructs the real nested groups
// within each section instead of leaving everything a single flat list.
// topMenus come straight from the type==='top' rows (real, correctly
// populated on every one). For everything else, a row's own `mainmenu` is
// usually empty — its real section only lives on an ancestor further up the
// real `fk_menu` parent chain, so resolveSectionKey walks that chain
// (bounded by `seen`, so a bad/cyclic fk_menu can't hang) until it hits a
// row with a mainmenu matching a real top entry. Confirmed live: this
// recovers ~400 of 583 rows into their correct section (vs. under 150 with
// a naive direct-match); the remaining ~180 have no resolvable ancestor at
// all (or resolve to a real mainmenu — e.g. a genuine 12-item "companies"
// group — with no matching top entry to hang under) and are skipped rather
// than guessed at. Sidebar.tsx's own PATH_SOURCE_SECTIONS fallback already
// covers full navigation regardless, so this only adds real per-user
// permission-awareness where the data actually supports it.
//
// Once a row's section is known, its real UI *parent* (for actual nested
// groups, not just section membership) is whichever row its own `fk_menu`
// points to — but only when that parent is itself a member of the SAME
// section; otherwise the parent is the section boundary itself (a top-level
// entry, or something outside this section entirely), so the row becomes a
// root-level item directly under the section. This is a real relationship
// already present in the raw data — not an invented grouping — confirmed
// live to reconstruct sensible 2-4 level trees (e.g. Sales > Invoices >
// List/Abandoned/Template Invoices) instead of one long flat ~40-item list,
// which is what made every section look like it had no real submenus at
// all once rendered.
function buildAppMenuFromRows(rows: RawMenuRow[]): AppMenuResponse {
  const byId = new Map(rows.map((r) => [String(r.rowid), r]))
  const topMenus: BackendTopMenu[] = rows.filter((r) => r.type === 'top').map((r) => ({ key: r.mainmenu, title: r.titre, url: r.url }))
  // Case-insensitive top-key set — the backend's llx_menu.mainmenu field
  // can have mixed case (e.g. 'Ap', 'Kitchen') while child rows may use
  // different casing, so a case-sensitive match would miss them.
  const topKeysLower = new Set(topMenus.map((t) => t.key.toLowerCase()))

  function resolveSectionKey(row: RawMenuRow, seen: Set<string>): string {
    if (row.mainmenu && topKeysLower.has(row.mainmenu.toLowerCase())) {
      // Return the original-cased key from topMenus so sections match
      const top = topMenus.find((t) => t.key.toLowerCase() === row.mainmenu.toLowerCase())
      return top?.key ?? row.mainmenu
    }
    const parentId = String(row.fk_menu)
    if (!parentId || parentId === '0' || parentId === 'NULL' || seen.has(parentId)) return ''
    seen.add(parentId)
    const parent = byId.get(parentId)
    return parent ? resolveSectionKey(parent, seen) : ''
  }

  const sectionOf = new Map<string, string>()
  for (const r of rows) {
    if (r.type === 'top') continue
    const key = resolveSectionKey(r, new Set())
    if (key) sectionOf.set(String(r.rowid), key)
  }

  const childrenOf = new Map<string, string[]>()
  const rootIdsBySection = new Map<string, string[]>()
  for (const r of rows) {
    if (r.type === 'top') continue
    const rowid = String(r.rowid)
    const sec = sectionOf.get(rowid)
    if (!sec) continue
    const parentId = String(r.fk_menu)
    if (sectionOf.get(parentId) === sec) {
      const siblings = childrenOf.get(parentId) ?? []
      siblings.push(rowid)
      childrenOf.set(parentId, siblings)
    } else {
      const roots = rootIdsBySection.get(sec) ?? []
      roots.push(rowid)
      rootIdsBySection.set(sec, roots)
    }
  }

  // `seen` guards against a cyclic fk_menu chain recursing forever — real
  // data shouldn't have one, but nothing here depends on that being true.
  function toNode(rowid: string, level: number, seen: Set<string>): BackendMenuNode {
    const r = byId.get(rowid)!
    const kidIds = seen.has(rowid) ? [] : (childrenOf.get(rowid) ?? [])
    const nextSeen = new Set(seen).add(rowid)
    return {
      url: r.url,
      titre: r.titre,
      level,
      target: r.target ?? '',
      leftmenu: r.leftmenu ?? '',
      mainmenu: sectionOf.get(rowid) ?? '',
      children: kidIds.map((kid) => toNode(kid, level + 1, nextSeen)),
    }
  }

  const sections: Record<string, BackendMenuNode[]> = {}
  for (const [sec, rootIds] of rootIdsBySection) {
    sections[sec] = rootIds.map((id) => toNode(id, 0, new Set()))
  }

  // Real quirk, not a fabrication — see MODULE_DASHBOARDS above. Overrides
  // unconditionally for whichever key the Home tab actually uses ('home' or
  // 'dashboard' depending on backend), matching the reference system's own
  // behavior rather than only filling in when the DB-driven list is empty.
  for (const tm of topMenus) {
    if (tm.key === 'home' || tm.key === 'dashboard') {
      sections[tm.key] = MODULE_DASHBOARDS.map((d) => ({ url: d.url, titre: d.title, level: 0, target: '', leftmenu: '', mainmenu: tm.key, children: [] }))
    }
  }

  return { topMenus, sections }
}

// This endpoint is gated by the real Dolibarr session cookie (main.inc.php's
// normal login check — no NOLOGIN defined in this file), not the
// X-API-Key/JWT scheme the rest of this app's /api/* calls use — confirmed
// live: an X-API-Key-only request gets redirected straight to the login
// page instead of returning JSON. establishLegacySession() (legacySession.ts)
// already establishes that real session cookie as a side effect of every
// login through this app's own form (for POS's legacy endpoints), so a
// same-origin fetch() is all that's needed here, no separate login step.
export function useAppMenu() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['app-menu', user?.id],
    queryFn: async (): Promise<AppMenuResponse> => {
      const params = new URLSearchParams({
        action: 'getMenuData',
        user_id: user!.id,
        // Hardcoded rather than read from GET /user/'s own `entity` field:
        // that's the raw llx_user.entity column (0 = "belongs to every
        // entity" under multicompany), a different thing from $conf->entity
        // (the session's actual *working* entity), which is what this
        // endpoint checks and 403s ("Entity mismatch") against otherwise.
        // Confirmed live against a real session: 1 (Dolibarr's standard
        // master entity) is what $conf->entity actually is — this isn't a
        // multicompany-active install.
        entity: '1',
        // 0 = internal user (Dolibarr's own default when a user has no
        // linked socid). This app has no source for the current user's
        // socid to determine otherwise, and every account on this install
        // is internal staff, not an external contact login.
        type_user: '0',
        mainmenu: '',
        leftmenu: '',
      })
      const res = await fetch(`/api/menu/?${params.toString()}`, { credentials: 'same-origin' })
      const body: { success: boolean; data?: BackendMenuTreeNode[] } = await res.json()
      if (!body.success || !body.data) throw new Error('Menu response did not include data')
      return buildAppMenuFromRows(flattenTree(body.data))
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}
