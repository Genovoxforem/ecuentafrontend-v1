import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../shared/components/layout/Sidebar'
import { ModernSidebar } from '../shared/components/layout/ModernSidebar'
import { Navbar } from '../shared/components/layout/Navbar'
import { useAuth } from '../features/auth/AuthContext'
import { useSidebarStyle } from '../context/SidebarStyleContext'
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

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} onLogout={handleLogout} />
      {/* -mt-px only for the modern shell: pulls the sidebar/navbar boundary into a 1px overlap so it paints over
          whatever faint seam independently-computed backdrop-blur leaves at that edge (see ModernSidebar/Navbar). */}
      <div className={`flex flex-1 overflow-hidden ${sidebarStyle === 'modern' ? 'relative -mt-px' : ''}`}>
        {sidebarStyle === 'modern' ? <ModernSidebar open={sidebarOpen} onLogout={handleLogout} /> : <Sidebar open={sidebarOpen} />}
        <main className="flex-1 overflow-y-auto soft-scrollbar p-6 bg-white dark:bg-gray-950">{children}</main>
      </div>
    </div>
  )
}
