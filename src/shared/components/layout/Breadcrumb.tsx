import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import type { NavItem, NavSection } from '../../../features/navTypes'
import { ROUTES } from '../../../routes'

// Walks a section's item tree depth-first and returns the chain of labels
// from the section root down to whichever item's own path matches
// `pathname` — checked before descending, since a real node (e.g. Agenda's
// "Events") can be both a link and a group; matching it stops the chain
// right there instead of also requiring one of its children to match.
// Returns null if no item in this section matches.
function findBreadcrumbChain(items: NavItem[], pathname: string): string[] | null {
  for (const item of items) {
    if (item.path === pathname) return [item.label]
    if ('items' in item && item.items) {
      const nested = findBreadcrumbChain(item.items, pathname)
      if (nested) return [item.label, ...nested]
    }
  }
  return null
}

function itemMatchesPath(item: NavItem, pathname: string): boolean {
  if (item.path === pathname) return true
  return 'items' in item && !!item.items && item.items.some((sub) => itemMatchesPath(sub, pathname))
}

function sectionContainsPath(section: NavSection, pathname: string): boolean {
  return section.items.some((item) => itemMatchesPath(item, pathname))
}

// The app redirects "/" to "/dashboard", but the home nav section uses
// "/home" as its path. Map "/dashboard" to the home section so the
// breadcrumb shows on the main landing page too.
const PATH_ALIASES: Record<string, string> = {
  '/dashboard': '/home',
  // Subledger and New Transaction are real backend pages, but only reachable
  // as in-page view-toggle/action buttons on the real "Ledger" page — no
  // independent leaf for either exists in the live llx_menu tree, so
  // buildBreadcrumb never finds a direct match. Same fix as /dashboard above:
  // alias them to the real "Ledger" leaf they're both variants of, rather
  // than inventing a fake standalone menu entry for either.
  [ROUTES.ledgerSubledger]: ROUTES.ledgerDashboard,
  [ROUTES.ledgerCreate]: ROUTES.ledgerDashboard,
}

const DETAIL_ROUTES = Object.entries(ROUTES)
  .filter(([key]) => /(?:Detail|Card)$/i.test(key))
  .map(([key, path]) => ({ key, path }))
  .sort((a, b) => b.path.split('/').length - a.path.split('/').length)

const DETAIL_PARENT_PATHS: Record<string, string> = {
  reportDetail: ROUTES.reports,
  expenseCard: ROUTES.expensesList,
  productLotSerialDetail: ROUTES.productList,
  ledgerPieceDetail: ROUTES.ledgerList,
  ledgerAccountCard: ROUTES.ledgerChartOfAccounts,
  activitiesDetail: ROUTES.hrmArea,
}

function routeMatches(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  return patternParts.length === pathParts.length && patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index])
}

function detailPageTitle(routeKey: string): string {
  const base = routeKey
    .replace(/(?:Detail|Card)$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} Details`
}

function detailParentPath(routeKey: string, routePath: string): string | undefined {
  if (DETAIL_PARENT_PATHS[routeKey]) return DETAIL_PARENT_PATHS[routeKey]
  const baseKey = routeKey.replace(/(?:Detail|Card)$/i, '')
  const listPath = (ROUTES as Record<string, string>)[`${baseKey}List`]
  if (listPath) return listPath
  const parentPath = routePath.split('/:')[0]
  return Object.values(ROUTES).find((path) => path === parentPath)
}

function resolvePath(pathname: string): string {
  return PATH_ALIASES[pathname] ?? pathname
}

// A param route like /warehouses/:id would also match the fixed path
// /warehouses/list; a path that has its own route is never a detail page.
const STATIC_ROUTE_PATHS = new Set<string>(Object.values(ROUTES).filter((path) => !path.includes(':')))

export function isDetailPagePath(pathname: string): boolean {
  const resolved = resolvePath(pathname)
  if (STATIC_ROUTE_PATHS.has(resolved)) return false
  return DETAIL_ROUTES.some((route) => routeMatches(route.path, resolved))
}

interface BreadcrumbTrail {
  sectionLabel: string
  sectionKey: string
  crumbs: string[]
}

export function buildBreadcrumb(sections: NavSection[], pathname: string): BreadcrumbTrail | null {
  if (pathname === '/dashboard' || pathname === '/') {
    return { sectionLabel: 'Home', sectionKey: 'home', crumbs: ['Main Dashboard'] }
  }
  const resolved = resolvePath(pathname)
  for (const section of sections) {
    if (sectionContainsPath(section, resolved)) {
      const chain = findBreadcrumbChain(section.items, resolved)
      return {
        sectionLabel: section.label,
        sectionKey: section.key,
        crumbs: chain ?? [],
      }
    }
  }

  const detailRoute = STATIC_ROUTE_PATHS.has(resolved) ? undefined : DETAIL_ROUTES.find((route) => routeMatches(route.path, resolved))
  if (detailRoute) {
    const parentPath = detailParentPath(detailRoute.key, detailRoute.path)
    if (parentPath) {
      const resolvedParent = resolvePath(parentPath)
      for (const section of sections) {
        if (!sectionContainsPath(section, resolvedParent)) continue
        const parentChain = findBreadcrumbChain(section.items, resolvedParent) ?? []
        return { sectionLabel: section.label, sectionKey: section.key, crumbs: [...parentChain, detailPageTitle(detailRoute.key)] }
      }
    }

    return { sectionLabel: 'Details', sectionKey: '', crumbs: [detailPageTitle(detailRoute.key)] }
  }

  return null
}

export function Breadcrumb({ sections, isModern }: { sections: NavSection[]; isModern?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()

  const trail = useMemo(() => buildBreadcrumb(sections, location.pathname), [sections, location.pathname])

  if (!trail) return null

  const textClass = isModern ? 'text-white/70' : 'text-text-muted'
  const activeTextClass = isModern ? 'text-white' : 'text-text'
  const sepClass = isModern ? 'text-white/30' : 'text-text-faint'

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 min-w-0 text-xs shrink-0">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className={`shrink-0 transition-colors hover:opacity-80 ${textClass}`}
        title="Dashboard"
      >
        <Home size={13} />
      </button>
      <ChevronRight size={11} className={`shrink-0 ${sepClass}`} />
      <span className={`shrink-0 font-medium ${activeTextClass}`}>{trail.sectionLabel}</span>
      {trail.crumbs.map((crumb, i) => {
        const isLast = i === trail.crumbs.length - 1
        return (
          <span key={`${crumb}-${i}`} className="flex items-center gap-1 min-w-0">
            <ChevronRight size={11} className={`shrink-0 ${sepClass}`} />
            <span className={`truncate ${isLast ? `font-semibold ${activeTextClass}` : textClass}`}>{crumb}</span>
          </span>
        )
      })}
    </nav>
  )
}
