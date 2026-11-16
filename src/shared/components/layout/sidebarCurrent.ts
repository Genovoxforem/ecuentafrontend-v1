import { createContext } from 'react'
import type { Location } from 'react-router-dom'
import type { NavItem } from '../../../features/navTypes'

// The one menu entry that means "you are here". A real backend menu can legitimately list the same page
// more than once: a heading whose own link duplicates a more specific child (Payroll's "Human Resource"),
// the same page under two different groups, or a plain link next to filtered ones that only differ by
// query string (Agenda's lists). Matching each entry on its own lit all of them at once, so instead every
// entry in the visible tree is scored and exactly one wins: a link whose query string equals the current
// one beats a plain link to the same page, and among equals the LAST one wins (the more specific entry,
// listed after its heading). Groups only light up as the ancestors of that winner.
function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => ['items' in item && item.items ? [item, ...flattenNav(item.items)] : [item]]).flat()
}

export function matchScore(path: string | undefined, location: Location): number {
  if (!path) return 0
  const queryIndex = path.indexOf('?')
  const itemPathname = queryIndex < 0 ? path : path.slice(0, queryIndex)
  // every report page (/reports/<category>/<report>) belongs to the "Reports" entry
  const pathname = location.pathname.startsWith('/reports/') ? '/reports' : location.pathname
  if (itemPathname !== pathname) return 0
  if (queryIndex < 0) return 1
  return path.slice(queryIndex) === location.search ? 2 : 0
}

// The Reports menu has no tree of its own (the backend's Reports menu is empty, the Reports Center is its one landing page), so every report page
// (/reports and /reports/<category>/<report>) belongs to it by address.
export function reportsMenuHolds(sectionKey: string, pathname: string): boolean {
  return sectionKey === 'reports' && (pathname === '/reports' || pathname.startsWith('/reports/'))
}

// The entry the user last clicked. Two entries can open the same page ("Product area" and "Services area"),
// and the one that was clicked is the one that should stay lit, not whichever happens to be listed last.
let lastClicked: { label: string; path: string } | null = null
// The menu (section) that entry was clicked in. A page can be listed in two menus at once (for example a report entry and the ledger page it opens);
// only the menu the user came from is the current one, not the first menu in the list that happens to hold the page.
let lastClickedSection: string | null = null

export function rememberNavClick(item: NavItem, sectionKey?: string | null): void {
  lastClicked = item.path ? { label: item.label, path: item.path } : null
  lastClickedSection = sectionKey ?? null
}

// Provided by each sidebar around a menu's own entries, so a click can say which menu it was made in.
export const NavSectionKey = createContext<string | null>(null)

// The ONE menu that is "current" out of the menus that hold the page: the one the user clicked in when it is among them, otherwise the first.
export function pickCurrentSection<S extends { key: string }>(holding: S[]): S | undefined {
  return holding.find((s) => s.key === lastClickedSection) ?? holding[0]
}

export function pickCurrentItem(items: NavItem[], location: Location): NavItem | null {
  let best: NavItem | null = null
  let bestScore = 0
  let clicked: NavItem | null = null
  for (const item of flattenNav(items)) {
    const score = matchScore(item.path, location)
    if (score > 0 && score >= bestScore) {
      best = item
      bestScore = score
    }
    if (score > 0 && lastClicked && item.label === lastClicked.label && item.path === lastClicked.path) clicked = item
  }
  return clicked && matchScore(clicked.path, location) === bestScore ? clicked : best
}

export function navContains(item: NavItem, target: NavItem | null): boolean {
  if (!target) return false
  if (item === target) return true
  return 'items' in item && !!item.items && item.items.some((sub) => navContains(sub, target))
}

// Provided by each sidebar around its item lists: the one entry that carries the "you are here" highlight.
export const CurrentNavItem = createContext<NavItem | null>(null)
