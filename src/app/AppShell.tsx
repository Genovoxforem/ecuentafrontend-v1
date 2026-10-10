import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '../shared/components/layout/Sidebar'
import { ModernSidebar } from '../shared/components/layout/ModernSidebar'
import { Navbar } from '../shared/components/layout/Navbar'
import { Breadcrumb, isDetailPagePath } from '../shared/components/layout/Breadcrumb'
import { isBannerListPage, PageBanner } from '../shared/components/layout/PageBanner'
import { RouteProgress, ContentLoader } from '../shared/components/layout/RouteProgress'
import { useAuth } from '../features/auth/AuthContext'
import { useSidebarStyle } from '../context/SidebarStyleContext'
import { useAppMenu } from '../shared/nav/appMenu.queries'
import { buildNavSections } from '../shared/nav/buildNavSections'
import { PATH_SOURCE_SECTIONS } from '../shared/nav/pathSourceSections'
import { LayoutGrid } from 'lucide-react'
import { ROUTES } from '../routes'
import { installAutoPagination } from '../shared/autoPaginate'
import { useTheme } from '../context/ThemeContext'

interface AppShellProps {
  children: ReactNode
}

// Sidebar starts pinned open on desktop but collapsed to its icon rail on
// tablet/mobile, where a permanently-expanded 200px+ panel would eat most of
// the viewport — matches the breakpoint below which Navbar starts hiding its
// own lower-priority icons.
const SIDEBAR_DEFAULT_BREAKPOINT = 1024

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= SIDEBAR_DEFAULT_BREAKPOINT)
  const { logout } = useAuth()
  const { sidebarStyle } = useSidebarStyle()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const routeContentRef = useRef<HTMLDivElement>(null)
  const { data: menu } = useAppMenu()
  const SECTIONS = useMemo(() => (menu ? buildNavSections(menu, PATH_SOURCE_SECTIONS, LayoutGrid) : PATH_SOURCE_SECTIONS), [menu])
  const isModern = sidebarStyle === 'modern'
  const hasListBanner = isBannerListPage(location.pathname, theme)
  const isDetailPage = isDetailPagePath(location.pathname)
  // Dashboard is the landing page — no breadcrumb there, only on inner pages.
  const showBreadcrumb = location.pathname !== '/dashboard' && location.pathname !== '/'

  useEffect(() => {
    const content = routeContentRef.current
    return content ? installAutoPagination(content) : undefined
  }, [])

  useLayoutEffect(() => {
    const content = routeContentRef.current
    if (!content) return
    content.scrollTop = 0
    content.scrollLeft = 0
    // Fade the new page in. Restarting the animation needs the class off, a
    // reflow, then the class on again; opacity alone, because a transform here
    // would re-base every sticky and fixed child inside the page.
    content.classList.remove('route-fade')
    void content.offsetWidth
    content.classList.add('route-fade')
  }, [location.pathname])

  // On a phone the sidebar is an overlay opened from the navbar toggle, not a
  // column that takes a fifth of the screen; it closes again once a page is chosen.
  useLayoutEffect(() => {
    if (window.innerWidth < 640) setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login)
  }

  return ( 
    <div className="h-screen flex flex-col overflow-hidden">
      <RouteProgress />
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} onLogout={handleLogout} />
      {/* -mt-px only for the modern shell: pulls the sidebar/navbar boundary into a 1px overlap so it paints over
          whatever faint seam independently-computed backdrop-blur leaves at that edge (see ModernSidebar/Navbar). */}
      <div className={`relative flex flex-1 overflow-hidden ${sidebarStyle === 'modern' ? '-mt-px' : ''}`}>
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
        <div className={`flex h-full shrink-0 ${sidebarOpen ? 'max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-40' : 'max-sm:hidden'}`}>
          {sidebarStyle === 'modern' ? <ModernSidebar open={sidebarOpen} onLogout={handleLogout} onOpen={() => setSidebarOpen(true)} /> : <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />}
        </div>
        {/* Breadcrumb lives in its own non-scrolling row ABOVE the padded
            scroll container, not as a sibling inside it. Page roots use
            `-m-6` to negate the scroll container's `p-6` and fill
            edge-to-edge; when the breadcrumb was a sibling inside the same
            padded <main>, that negative top margin pulled the page up over
            the breadcrumb and hid it. Splitting them into separate flex
            items means the page's `-m-6` only pulls it to the top edge of
            the scroll container (negating its padding), never into the
            breadcrumb row above. */}
        <main className={`flex min-h-0 min-w-0 flex-col flex-1 overflow-hidden bg-surface border-t border-border ${theme === 'blue-metal' ? 'blue-theme-shell m-6' : ''}`}>
          {/* In the blue-metal theme the banner below carries the breadcrumb itself
              (see PageBanner.tsx) — this row would just repeat it above a second time. */}
          {showBreadcrumb && theme !== 'blue-metal' && (
            <div className="shrink-0 empty:hidden p-2.5">
              <Breadcrumb sections={SECTIONS} isModern={isModern} />
            </div>
          )}
          <div className="shrink-0 px-6 empty:hidden">
            <PageBanner sections={SECTIONS} pathname={location.pathname} />
          </div>
          {/* flex flex-col here lets a page's root opt into flex-1 (fill-or-overflow the
              scrollport) using flexbox's own algorithm instead of percentage min-height, which
              doesn't reliably resolve against this element's content-box height through the
              ancestor chain — confirmed empirically (came up ~27px short on a real viewport).
              No visual effect on pages that don't opt in: a single non-growing flex child sizes
              to its own content along the column axis exactly like normal block flow, and
              stretches to fill the width either way. */}
          {/* A classic (non-overlay) OS scrollbar reserves its own width inside this
              scroll container, so the page content renders a few px narrower than the
              banner above it (which sits outside the scroll container and never shrinks).
              blue-metal hides the scrollbar track entirely (no-scrollbar) instead of just
              thinning it (soft-scrollbar) so that width never gets reserved in the first
              place — scrolling itself still works, only its visual affordance is gone. */}
          <div ref={routeContentRef} id="route-page-content" data-list-banner={hasListBanner ? 'true' : undefined} data-page-banner={theme === 'blue-metal' ? 'true' : undefined} data-detail-page={isDetailPage ? 'true' : undefined} className={`flex min-h-0 min-w-0 flex-col flex-1 overflow-y-auto p-6 ${theme === 'blue-metal' ? 'no-scrollbar' : 'soft-scrollbar'}`}>
            <ContentLoader>{children}</ContentLoader>
          </div>
        </main>
      </div>
    </div>
  )
}
