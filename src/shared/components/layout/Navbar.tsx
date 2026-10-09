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
type PanelName = 'account' | 'settings' | 'notifications' | 'daily-summary' | 'clock' | 'apps' | 'pos' | null

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
            ? 'hover:-translate-y-0.5 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-transparent dark:hover:text-(--color-accent-teal-2) dark:hover:shadow-[0_0_0_1px_var(--color-accent-teal-2),0_0_14px_var(--color-accent-teal-2),0_0_22px_var(--color-accent-cyan-2)]'
            : ''
        }`}
      >
        {children}
      </button>
      {title && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute top-full z-[70] mt-2 whitespace-nowrap rounded-md border border-(--color-accent-teal-2)/40 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 dark:bg-gray-700 ${
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`}>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  const darkModern = isModern && theme !== 'light'
  const lightSurface = theme === 'light'
  const logoFilter = lightSurface
    ? '[filter:brightness(0.62)_saturate(1.8)_contrast(1.2)_drop-shadow(0_0_0.6px_rgba(7,38,64,0.7))]'
    : '[filter:brightness(0)_saturate(100%)_invert(78%)_sepia(69%)_saturate(1200%)_hue-rotate(138deg)_brightness(100%)_contrast(100%)] drop-shadow-[0_0_5px_rgba(34,211,238,0.45)]'

  return (
    <nav
      className={`relative h-[67px] pr-6 ${darkModern ? 'dark' : `flex items-center justify-between gap-4 bg-rail-bg ${lightSurface ? 'border-b border-slate-200' : ''}`}`}
    >
      {darkModern && (
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
        </>
      )}
      {/* z-30, above the z-10 pinned headers and footers that pages stick inside <main>: the
          account / notification / settings panels open downward out of this bar, and at z-10
          the page's own header (later in the DOM) painted over them. */}
      <div
        className="relative z-30 flex items-center justify-between gap-4 h-full w-full"
        style={darkModern ? { filter: MODERN_CONTENT_SHADOW } : undefined}
      >
      <div className={`relative z-10 flex h-full shrink-0 items-center transition-[width] duration-300 ${sidebarOpen ? (isModern ? 'w-[230px]' : 'w-[259px]') : 'w-[58px]'}`}>
        <a
          href="/dashboard"
          aria-label="ECUENTA dashboard"
          className={`ml-1 mr-2 translate-y-1 flex h-[2.72rem] shrink-0 items-center justify-start overflow-hidden ${
            sidebarOpen ? 'w-[min(13.2rem,calc(100%-3rem))] pl-2 pr-1' : 'w-[2.37rem]'
          }`}
        >
          {sidebarOpen ? (
            <img
              src={logoFull}
              alt="ECUENTA"
              className={`h-[2.27rem] w-auto max-w-full object-contain ${logoFilter}`}
            />
          ) : (
            <span className="relative h-[2.37rem] w-[2.37rem] shrink-0 overflow-hidden">
              <img
                src={logoFull}
                alt="ECUENTA"
                className={`absolute left-0 top-1/2 h-[2.37rem] w-auto max-w-none -translate-y-1/2 ${logoFilter}`}
              />
            </span>
          )}
        </a>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className={`absolute ${sidebarOpen ? '-right-[5px]' : 'right-[-11px]'} h-7 w-7 flex translate-x-1/2 items-center justify-center rounded-full transition-colors ${lightSurface ? 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800' : 'border border-white/20 bg-[#0b1f33] text-white/80 hover:border-[#66caff] hover:bg-[#12304a] hover:text-white'}`}
        >
          <SidebarToggleIcon expanded={sidebarOpen} />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-center gap-3 max-w-xl min-w-0">
        <div
          className="flex-1 min-w-[110px] flex items-center gap-2 h-9 px-3 rounded-full border border-slate-400/70 dark:border-slate-500/80 bg-surface-alt text-text-faint cursor-text"
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

      <div className="relative z-10 flex items-center gap-2 shrink-0">
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
            className={darkModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <BarChart3 size={19} />
          </IconButton>
          {openPanel === 'daily-summary' && <DailySummaryPanel onClose={closePanel} />}
        </div>

        <div className="relative hidden lg:block">
          <IconButton
            title="POS"
            glow
            active={openPanel === 'pos'}
            onClick={() => togglePanel('pos')}
            className={darkModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <CreditCard size={19} />
          </IconButton>
          {openPanel === 'pos' && (
            <div className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-text-faint">Open point of sale</p>
              {[
                { label: 'POS V1', sub: 'Classic layout', to: ROUTES.pos },
                { label: 'POS V2', sub: 'New design', to: ROUTES.posV2 },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => {
                    closePanel()
                    navigate(o.to)
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-alt"
                >
                  <CreditCard size={16} className="shrink-0 text-brand" />
                  <span>
                    <span className="block text-sm font-semibold text-text">{o.label}</span>
                    <span className="block text-xs text-text-faint">{o.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <IconButton title="Kitchen" glow onClick={() => navigate(ROUTES.kitchenDashboard)} className={darkModern ? MODERN_ICON_REST_COLOR : ''}>
            <ChefHat size={19} />
          </IconButton>
        </div>

        <div className="relative" ref={openPanel === 'settings' ? panelRef : undefined}>
          <IconButton
            title="Settings"
            glow
            active={openPanel === 'settings'}
            onClick={() => togglePanel('settings')}
            className={darkModern ? MODERN_ICON_REST_COLOR : ''}
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
            className={darkModern ? MODERN_ICON_REST_COLOR : ''}
          >
            <Bell size={19} />
            {notificationCount > 0 && <Badge count={notificationCount} color="bg-danger" />}
          </IconButton>
          {openPanel === 'notifications' && <NotificationsPanel onClose={closePanel} />}
        </div>

        <IconButton title="Events" glow onClick={() => navigate(ROUTES.agenda)} className={`max-sm:hidden ${darkModern ? MODERN_ICON_REST_COLOR : ''}`}>
          <CalendarDays size={19} />
        </IconButton>

        {/* Match the legacy headset launcher: it starts TicketDesk, passes the signed-in user, then redirects. */}
        <div className="max-sm:hidden">
          <IconButton title="Ticket Desk" glow onClick={() => navigate(ROUTES.ticketDesk)} className={darkModern ? MODERN_ICON_REST_COLOR : ''}>
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
