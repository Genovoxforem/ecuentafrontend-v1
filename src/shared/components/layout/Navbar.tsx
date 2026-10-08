import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sun, Moon, BarChart3, CreditCard, ChefHat, Settings, Bell, CalendarDays, Headset, LogIn, LogOut, ChevronDown, PanelLeft, LayoutList } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useSidebarStyle } from '../../../context/SidebarStyleContext'
import { useAuth, type AuthUser } from '../../../features/auth/AuthContext'
import { ROUTES } from '../../../routes'
import { AccountPanel } from './navbar/AccountPanel'
import { SettingsMegaMenu } from './navbar/SettingsMegaMenu'
import { NotificationsPanel } from './navbar/NotificationsPanel'
import { DailySummaryPanel } from './navbar/DailySummaryPanel'
import { ClockInPanel } from './navbar/ClockInPanel'
import { AllAppsDrawer } from './navbar/AllAppsDrawer'
import { useAttendanceStatus } from '../../../features/attendance/attendance.queries'
import { useNotificationCount } from '../../../features/notifications/notifications.queries'
import { useTodayNewLeadsCount } from '../../../features/projects/projects.queries'
import { Avatar } from '../Avatar'
import { MODERN_GLASS_BG, MODERN_GLASS_SHEEN, MODERN_CONTENT_SHADOW, MODERN_ICON_REST_COLOR } from './modernGlass'
import logoFull from '../../../assets/Ecuenta_logo.png'
type PanelName = 'account' | 'settings' | 'notifications' | 'daily-summary' | 'clock' | 'apps' | null

// Custom styled tooltip (replaces the native `title` attribute), shown below
// the icon on hover via CSS-only group-hover, plus an optional glow ring for
// the row of feature icons between the theme toggle and the account menu.
// The glow uses --color-accent-teal-2/-cyan-2 — the same teal-to-cyan
// gradient as the Ecuenta logo mark — so the effect reads as on-brand.
function IconButton({
  children,
  onClick,
  active,
  title,
  glow,
  className = '',
  tooltipAlign = 'center',
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
  glow?: boolean
  className?: string
  tooltipAlign?: 'center' | 'start'
}) {
  return (
    <div className="relative group/tip">
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
          active ? 'bg-brand/10 text-brand' : className ? 'hover:bg-surface-alt' : 'text-text-muted hover:bg-surface-alt hover:text-text'
        } ${className} ${
          glow
            ? 'hover:-translate-y-0.5 hover:text-(--color-accent-teal-2) hover:shadow-[0_0_0_1px_var(--color-accent-teal-2),0_0_14px_var(--color-accent-teal-2),0_0_22px_var(--color-accent-cyan-2)]'
            : ''
        }`}
      >
        {children}
      </button>
      {title && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute top-full z-40 mt-2 whitespace-nowrap rounded-md border border-(--color-accent-teal-2)/40 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 dark:bg-gray-700 ${
            tooltipAlign === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {title}
        </span>
      )}
    </div>
  )
}

function Badge({ count, color }: { count: number; color: string }) {
  return <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 text-white text-center ${color}`}>{count}</span>
}

function displayName(user: AuthUser | null) {
  const full = [user?.firstname, user?.lastname].filter(Boolean).join(' ')
  return full || user?.login || 'User'
}

function SidebarToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`}>
      <path d="M7.66699 12.6668L3.66699 8.00016L7.66699 3.3335" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path opacity="0.5" d="M12.667 12.6668L8.66699 8.00016L12.667 3.3335" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Icon row ported from the legacy htdocs/main.inc.php navbar, left to
// right: Daily Summary, POS, Kitchen, Settings, Notifications, Events
// (agenda), Clock In/Out. POS used to be a separate standalone app
// (pos_standalone - v1, its own repo/build/dev server), opened in a new tab
// with a bearer-token/backend/returnTo handoff — it's now merged into this
// app as an in-app route (src/pos/**, mounted at /pos in src/App.tsx), so it
// shares this session directly and just needs an SPA navigation.
export function Navbar({ sidebarOpen, onToggleSidebar, onLogout }: { sidebarOpen: boolean; onToggleSidebar: () => void; onLogout: () => void }) {
  const navigate = useNavigate()
  const { data: notificationCount = 0 } = useNotificationCount()
  const { data: todayNewLeads } = useTodayNewLeadsCount()
  const { theme, setTheme } = useTheme()
  const { sidebarStyle, setSidebarStyle } = useSidebarStyle()
  const { user } = useAuth()
  const { data: attendance } = useAttendanceStatus()
  const [openPanel, setOpenPanel] = useState<PanelName>(null)
  const [appsQuery, setAppsQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!openPanel) return
    const onClickOutside = (e: MouseEvent) => {
      // Layers a panel renders on <body> through a portal (a modal, the All Apps drawer) are not
      // inside panelRef in the DOM, yet belong to the open panel — a click in them is not "outside".
      if (e.target instanceof Element && e.target.closest('[data-navbar-layer]')) return
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenPanel(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [openPanel])

  function togglePanel(name: PanelName) {
    setOpenPanel((cur) => (cur === name ? null : name))
  }

  function closePanel() {
    setOpenPanel(null)
  }

  const isModern = sidebarStyle === 'modern'

  return (
    <nav
      className={`relative h-14 pr-4 ${isModern ? 'dark' : 'flex items-center justify-between gap-4 bg-rail-bg'}`}
    >
      {isModern && (
        <>
          {/* Solid dark base — same reason as ModernSidebar: the glass tint at
              0.22 alpha is see-through, so without this the navbar washes out
              to near-white over a light-mode page. Keeps the navbar and sidebar
              visually continuous at their shared edge. */}
          <div className={`absolute inset-0 ${theme === 'blue-metal' ? 'bg-[#06111d]' : 'bg-gray-900'}`} />
          {/* Flat translucent tint, no blur — plain glass, matching ModernSidebar. Kept on its own childless layer,
              separate from the content below, so the content's drop-shadow never touches this tint. Flat color
              (not a gradient) lines up seamlessly with the sidebar's identical tint at their shared edge. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: theme === 'blue-metal' ? 'rgba(6, 17, 29, 0.42)' : MODERN_GLASS_BG,
              backgroundImage: theme === 'blue-metal' ? 'linear-gradient(135deg, rgba(66,200,255,0.2), rgba(22,139,255,0.05) 38%, transparent 68%)' : MODERN_GLASS_SHEEN,
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </>
      )}
      {/* z-30, above the z-10 pinned headers and footers that pages stick inside <main>: the
          account / notification / settings panels open downward out of this bar, and at z-10
          the page's own header (later in the DOM) painted over them. */}
      <div
        className="relative z-30 flex items-center justify-between gap-4 h-full w-full"
        style={isModern ? { filter: MODERN_CONTENT_SHADOW } : undefined}
      >
      <div className={`relative z-10 flex h-full shrink-0 items-center transition-[width] duration-300 ${sidebarOpen ? (isModern ? 'w-64' : 'w-80') : 'w-16'}`}>
        <a
          href="/dashboard"
          aria-label="ECUENTA dashboard"
          className={`mx-2 flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cyan-400/70 bg-[linear-gradient(145deg,rgba(8,57,78,0.96),rgba(3,24,43,0.98))] shadow-[inset_0_1px_0_rgba(103,232,249,0.2),0_0_12px_rgba(34,211,238,0.16)] ${
            sidebarOpen ? 'w-[min(11rem,calc(100%-3rem))] px-2' : 'w-10'
          }`}
        >
          {sidebarOpen ? (
            <img
              src={logoFull}
              alt="ECUENTA"
              className="h-8 w-auto max-w-full object-contain [filter:brightness(0)_saturate(100%)_invert(78%)_sepia(69%)_saturate(1200%)_hue-rotate(138deg)_brightness(100%)_contrast(100%)] drop-shadow-[0_0_5px_rgba(34,211,238,0.45)]"
            />
          ) : (
            <span className="relative h-8 w-8 shrink-0 overflow-hidden">
              <img
                src={logoFull}
                alt="ECUENTA"
                className="absolute left-0 top-1/2 h-8 w-auto max-w-none -translate-y-1/2 [filter:brightness(0)_saturate(100%)_invert(78%)_sepia(69%)_saturate(1200%)_hue-rotate(138deg)_brightness(100%)_contrast(100%)] drop-shadow-[0_0_5px_rgba(34,211,238,0.45)]"
              />
            </span>
          )}
        </a>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="absolute right-0 flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-lg border border-border bg-surface text-text-muted shadow-sm transition-colors hover:bg-surface-alt hover:text-brand"
        >
          <SidebarToggleIcon expanded={sidebarOpen} />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-center gap-3 max-w-xl min-w-0">
        <div
          className="flex-1 min-w-[110px] flex items-center gap-2 h-9 px-3 rounded-full bg-surface-alt text-text-faint cursor-text"
          onClick={() => {
            setOpenPanel('apps')
            searchInputRef.current?.focus()
          }}
        >
          <Search size={16} className="shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={appsQuery}
            onChange={(e) => setAppsQuery(e.target.value)}
            onFocus={() => setOpenPanel('apps')}
            placeholder="Search anythings"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-text placeholder-text-faint"
          />
        </div>
        {openPanel === 'apps' && <AllAppsDrawer query={appsQuery} onQueryChange={setAppsQuery} onClose={closePanel} />}
        <div className="hidden lg:flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-full border border-border text-sm text-text-muted whitespace-nowrap">
          Today New Leads
          <span className="min-w-6 h-6 px-1 flex items-center justify-center rounded-full bg-info-bg text-info-fg text-xs font-semibold">{todayNewLeads ?? '–'}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-1 shrink-0">
        <div className="hidden md:flex items-center rounded-full bg-surface-alt p-1 mr-1" title="Sidebar style">
          <button
            type="button"
            onClick={() => setSidebarStyle('legacy')}
            title="Legacy sidebar"
            className={`flex items-center gap-1 h-7 px-2 rounded-full text-xs font-medium transition-colors ${
              sidebarStyle === 'legacy' ? 'bg-white shadow text-brand dark:bg-gray-900' : 'text-text-faint'
            }`}
          >
            <PanelLeft size={14} />
            <span className="hidden xl:inline">Legacy</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarStyle('modern')}
            title="Modern sidebar"
            className={`flex items-center gap-1 h-7 px-2 rounded-full text-xs font-medium transition-colors ${
              sidebarStyle === 'modern' ? 'bg-white shadow text-brand dark:bg-gray-900' : 'text-text-faint'
            }`}
          >
            <LayoutList size={14} />
            <span className="hidden xl:inline">Modern</span>
          </button>
        </div>

        <div className="flex items-center rounded-full bg-surface-alt p-1 mr-1" aria-label="Color theme">
          <button
            type="button"
            onClick={() => setTheme('light')}
            aria-label="Light theme"
            aria-pressed={theme === 'light'}
            className={`w-7 h-7 flex items-center justify-center rounded-full ${theme === 'light' ? 'bg-white shadow text-amber-500' : 'text-text-faint'}`}
          >
            <Sun size={15} />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            aria-label="Dark theme"
            aria-pressed={theme === 'dark'}
            className={`w-7 h-7 flex items-center justify-center rounded-full ${theme === 'dark' ? 'bg-gray-900 shadow text-blue-300' : 'text-text-faint'}`}
          >
            <Moon size={15} />
          </button>
          <button
            type="button"
            onClick={() => setTheme('blue-metal')}
            title="Blue Metal theme"
            aria-label="Blue Metal theme"
            aria-pressed={theme === 'blue-metal'}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-shadow ${theme === 'blue-metal' ? 'bg-[#06111d] shadow-[0_0_0_1px_#168bff,0_0_10px_#168bff80]' : 'hover:bg-surface-hover'}`}
          >
            <span className="h-4 w-4 rounded-full border border-white/50 bg-[linear-gradient(135deg,#42c8ff_0%,#168bff_48%,#06111d_100%)]" />
          </button>
        </div>

        <div className="relative hidden lg:block" ref={openPanel === 'daily-summary' ? panelRef : undefined}>
          <IconButton
            title="Daily Summary"
            glow
            active={openPanel === 'daily-summary'}
            onClick={() => togglePanel('daily-summary')}
            className={isModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <BarChart3 size={19} />
          </IconButton>
          {openPanel === 'daily-summary' && <DailySummaryPanel onClose={closePanel} />}
        </div>

        <div className="hidden lg:block">
          <IconButton
            title="POS"
            glow
            onClick={() => navigate('/pos')}
            className={isModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <CreditCard size={19} />
          </IconButton>
        </div>

        <div className="hidden lg:block">
          <IconButton title="Kitchen" glow onClick={() => navigate(ROUTES.kitchenDashboard)} className={isModern ? MODERN_ICON_REST_COLOR : ''}>
            <ChefHat size={19} />
          </IconButton>
        </div>

        <div className="relative" ref={openPanel === 'settings' ? panelRef : undefined}>
          <IconButton
            title="Settings"
            glow
            active={openPanel === 'settings'}
            onClick={() => togglePanel('settings')}
            className={isModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <Settings size={19} />
          </IconButton>
          {openPanel === 'settings' && <SettingsMegaMenu onClose={closePanel} />}
        </div>

        <div className="relative" ref={openPanel === 'notifications' ? panelRef : undefined}>
          <IconButton
            title="Notifications"
            glow
            active={openPanel === 'notifications'}
            onClick={() => togglePanel('notifications')}
            className={isModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <Bell size={19} />
            {notificationCount > 0 && <Badge count={notificationCount} color="bg-danger" />}
          </IconButton>
          {openPanel === 'notifications' && <NotificationsPanel onClose={closePanel} />}
        </div>

        <IconButton title="Events" glow onClick={() => navigate(ROUTES.agenda)} className={`max-sm:hidden ${isModern ? MODERN_ICON_REST_COLOR : ''}`}>
          <CalendarDays size={19} />
        </IconButton>

        {/* The classic headset button ("Ticket Desk") — its launcher opens a separate Node app; the tickets module is the React equivalent. */}
        <div className="max-sm:hidden">
          <IconButton title="Ticket Desk" glow onClick={() => navigate(ROUTES.ticketList)} className={isModern ? MODERN_ICON_REST_COLOR : ''}>
            <Headset size={19} />
          </IconButton>
        </div>

        <div className="relative max-sm:hidden" ref={openPanel === 'clock' ? panelRef : undefined}>
          <IconButton
            title={attendance?.isClockedIn ? 'Clock Out' : 'Clock In'}
            active={openPanel === 'clock'}
            onClick={() => togglePanel('clock')}
            className={attendance?.isClockedIn ? 'text-danger' : 'text-success'}
          >
            {attendance?.isClockedIn ? <LogOut size={19} /> : <LogIn size={19} />}
          </IconButton>
          {openPanel === 'clock' && <ClockInPanel onClose={closePanel} />}
        </div>

        <div className="relative ml-2" ref={openPanel === 'account' ? panelRef : undefined}>
          <button
            type="button"
            onClick={() => togglePanel('account')}
            className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-full hover:bg-surface-alt transition-colors"
          >
            <span className="text-right leading-tight hidden sm:block">
              <span className="flex items-center gap-1 text-sm font-semibold text-text">
                <span className="max-w-[130px] truncate">{displayName(user)}</span>
                <ChevronDown size={14} className="text-text-faint" />
              </span>
              <span className="block text-xs text-text-faint truncate max-w-[130px]">{user?.login}</span>
            </span>
            <Avatar photo={user?.photo} name={displayName(user)} size={38} />
          </button>

          {openPanel === 'account' && <AccountPanel user={user} onClose={closePanel} onLogout={onLogout} />}
        </div>
      </div>
      </div>
    </nav>
  )
}
