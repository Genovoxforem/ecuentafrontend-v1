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
  if (itemPathname !== location.pathname) return 0
  if (queryIndex < 0) return 1
  return path.slice(queryIndex) === location.search ? 2 : 0
}

// The entry the user last clicked. Two entries can open the same page ("Product area" and "Services area"),
// and the one that was clicked is the one that should stay lit, not whichever happens to be listed last.
let lastClicked: { label: string; path: string } | null = null

export function rememberNavClick(item: NavItem): void {
  lastClicked = item.path ? { label: item.label, path: item.path } : null
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
