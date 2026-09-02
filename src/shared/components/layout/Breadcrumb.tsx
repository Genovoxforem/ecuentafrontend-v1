import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import type { NavItem, NavLeafItem, NavSection } from '../../../features/navTypes'

function isLeaf(item: NavItem): item is NavLeafItem {
  return !('items' in item) || !item.items
}

// Walks a section's item tree depth-first and returns the chain of labels
// from the section root down to the leaf whose path matches `pathname`.
// Returns null if no item in this section matches.
function findBreadcrumbChain(items: NavItem[], pathname: string): string[] | null {
  for (const item of items) {
    if (isLeaf(item)) {
      if (item.path === pathname) return [item.label]
    } else {
      const nested = findBreadcrumbChain(item.items, pathname)
      if (nested) return [item.label, ...nested]
    }
  }
  return null
}

function itemMatchesPath(item: NavItem, pathname: string): boolean {
  if (isLeaf(item)) return item.path === pathname
  return item.items.some((sub) => itemMatchesPath(sub, pathname))
}

function sectionContainsPath(section: NavSection, pathname: string): boolean {
  return section.items.some((item) => itemMatchesPath(item, pathname))
}

// The app redirects "/" to "/dashboard", but the home nav section uses
// "/home" as its path. Map "/dashboard" to the home section so the
// breadcrumb shows on the main landing page too.
const PATH_ALIASES: Record<string, string> = {
  '/dashboard': '/home',
}

function resolvePath(pathname: string): string {
  return PATH_ALIASES[pathname] ?? pathname
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
