import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '../shared/components/layout/Sidebar'
import { ModernSidebar } from '../shared/components/layout/ModernSidebar'
import { Navbar } from '../shared/components/layout/Navbar'
import { Breadcrumb } from '../shared/components/layout/Breadcrumb'
import { RouteProgress, ContentLoader } from '../shared/components/layout/RouteProgress'
import { useAuth } from '../features/auth/AuthContext'
import { useSidebarStyle } from '../context/SidebarStyleContext'
import { useAppMenu } from '../shared/nav/appMenu.queries'
import { buildNavSections } from '../shared/nav/buildNavSections'
import { PATH_SOURCE_SECTIONS } from '../shared/nav/pathSourceSections'
import { LayoutGrid } from 'lucide-react'
import { ROUTES } from '../routes'

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
  const navigate = useNavigate()
  const location = useLocation()
  const { data: menu } = useAppMenu()
  const SECTIONS = useMemo(() => (menu ? buildNavSections(menu, PATH_SOURCE_SECTIONS, LayoutGrid) : PATH_SOURCE_SECTIONS), [menu])
  const isModern = sidebarStyle === 'modern'
  // Dashboard is the landing page — no breadcrumb there, only on inner pages.
  const showBreadcrumb = location.pathname !== '/dashboard' && location.pathname !== '/'

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
      <div className={`flex flex-1 overflow-hidden ${sidebarStyle === 'modern' ? 'relative -mt-px' : ''}`}>
        {sidebarStyle === 'modern' ? <ModernSidebar open={sidebarOpen} onLogout={handleLogout} onOpen={() => setSidebarOpen(true)} /> : <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />}
        {/* Breadcrumb lives in its own non-scrolling row ABOVE the padded
            scroll container, not as a sibling inside it. Page roots use
            `-m-6` to negate the scroll container's `p-6` and fill
            edge-to-edge; when the breadcrumb was a sibling inside the same
            padded <main>, that negative top margin pulled the page up over
            the breadcrumb and hid it. Splitting them into separate flex
            items means the page's `-m-6` only pulls it to the top edge of
            the scroll container (negating its padding), never into the
            breadcrumb row above. */}
        <main className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-950">
          {showBreadcrumb && (
            <div className="shrink-0 px-6 pt-4 pb-3">
              <Breadcrumb sections={SECTIONS} isModern={isModern} />
            </div>
          )}
          {/* flex flex-col here lets a page's root opt into flex-1 (fill-or-overflow the
              scrollport) using flexbox's own algorithm instead of percentage min-height, which
              doesn't reliably resolve against this element's content-box height through the
              ancestor chain — confirmed empirically (came up ~27px short on a real viewport).
              No visual effect on pages that don't opt in: a single non-growing flex child sizes
              to its own content along the column axis exactly like normal block flow, and
              stretches to fill the width either way. */}
          <div className="flex flex-col flex-1 overflow-y-auto soft-scrollbar p-6">
            <ContentLoader>{children}</ContentLoader>
          </div>
        </main>
      </div>
    </div>
  )
}
