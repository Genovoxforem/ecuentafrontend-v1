import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Sun, Moon, BarChart3, CreditCard, ChefHat, Settings, Bell, CalendarDays, LogIn, LogOut, ChevronDown } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useAuth, type AuthUser } from '../../../features/auth/AuthContext'
import { ROUTES } from '../../../routes'
import { AccountPanel } from './navbar/AccountPanel'
import { SettingsMegaMenu } from './navbar/SettingsMegaMenu'
import { NotificationsPanel } from './navbar/NotificationsPanel'
import { DailySummaryPanel } from './navbar/DailySummaryPanel'
import { ClockInPanel } from './navbar/ClockInPanel'
import { useAttendanceStatus } from '../../../features/attendance/attendance.queries'
import { Avatar } from '../Avatar'
import logoIcon from '../../../assets/log3.png'
import logoFull from '../../../assets/Ecuenta_logo.png'

type PanelName = 'account' | 'settings' | 'notifications' | 'daily-summary' | 'clock' | null

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

// Icon row ported from the legacy htdocs/main.inc.php navbar, left to
// right: Daily Summary, POS, Kitchen, Settings, Notifications, Events
// (agenda), Clock In/Out. POS has no module built yet so it stays a plain
// non-interactive icon rather than fabricating a panel for it.
export function Navbar({ sidebarOpen, onToggleSidebar, onLogout }: { sidebarOpen: boolean; onToggleSidebar: () => void; onLogout: () => void }) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { data: attendance } = useAttendanceStatus()
  const [openPanel, setOpenPanel] = useState<PanelName>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openPanel) return
    const onClickOutside = (e: MouseEvent) => {
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

  return (
    <nav className="flex items-center justify-between h-14 px-4 gap-4 bg-rail-bg border-b border-black/10 dark:border-white/10">
      <div className="flex items-center gap-3 shrink-0">
        {sidebarOpen ? (
          <span className="flex h-8 items-center rounded-md dark:bg-white/90 dark:px-2 dark:py-1">
            <img src={logoFull} alt="ECUENTA" className="h-full w-auto object-contain" />
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-md dark:bg-white/90 dark:p-1">
            <img src={logoIcon} alt="ECUENTA" className="h-full w-full object-contain" />
          </span>
        )}
        <IconButton
          onClick={onToggleSidebar}
          active={sidebarOpen}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          tooltipAlign="start"
          className="text-text"
        >
          <Menu
            size={24}
            strokeWidth={2.25}
            className="transition-[filter] duration-200 group-hover/tip:[filter:drop-shadow(0_0_5px_var(--color-accent-teal-2))_drop-shadow(0_0_9px_var(--color-accent-cyan-2))]"
          />
        </IconButton>
      </div>

      <div className="flex-1 flex items-center gap-3 max-w-xl min-w-0">
        <div className="flex-1 min-w-[110px] flex items-center gap-2 h-9 px-3 rounded-full bg-surface-alt text-text-faint">
          <Search size={16} className="shrink-0" />
          <input type="text" placeholder="Search anythings" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-text placeholder-text-faint" />
        </div>
        <div className="hidden lg:flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-full border border-border text-sm text-text-muted whitespace-nowrap">
          Today New Leads
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-info-bg text-info-fg text-xs font-semibold">27</span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="flex items-center rounded-full bg-surface-alt p-1 mr-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`w-7 h-7 flex items-center justify-center rounded-full ${theme === 'light' ? 'bg-white shadow text-amber-500' : 'text-text-faint'}`}
          >
            <Sun size={15} />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`w-7 h-7 flex items-center justify-center rounded-full ${theme === 'dark' ? 'bg-gray-900 shadow text-blue-300' : 'text-text-faint'}`}
          >
            <Moon size={15} />
          </button>
        </div>

        <div className="relative hidden lg:block" ref={openPanel === 'daily-summary' ? panelRef : undefined}>
          <IconButton title="Daily Summary" glow active={openPanel === 'daily-summary'} onClick={() => togglePanel('daily-summary')}>
            <BarChart3 size={19} />
          </IconButton>
          {openPanel === 'daily-summary' && <DailySummaryPanel onClose={closePanel} />}
        </div>

        <div className="hidden lg:block">
          <IconButton title="POS" glow>
            <CreditCard size={19} />
          </IconButton>
        </div>

        <div className="hidden lg:block">
          <IconButton title="Kitchen" glow onClick={() => navigate(ROUTES.kitchenDashboard)}>
            <ChefHat size={19} />
          </IconButton>
        </div>

        <div className="relative" ref={openPanel === 'settings' ? panelRef : undefined}>
          <IconButton title="Settings" glow active={openPanel === 'settings'} onClick={() => togglePanel('settings')}>
            <Settings size={19} />
          </IconButton>
          {openPanel === 'settings' && <SettingsMegaMenu onClose={closePanel} />}
        </div>

        <div className="relative" ref={openPanel === 'notifications' ? panelRef : undefined}>
          <IconButton title="Notifications" glow active={openPanel === 'notifications'} onClick={() => togglePanel('notifications')}>
            <Bell size={19} />
            <Badge count={2} color="bg-danger" />
          </IconButton>
          {openPanel === 'notifications' && <NotificationsPanel onClose={closePanel} />}
        </div>

        <IconButton title="Events" glow onClick={() => navigate(ROUTES.agenda)}>
          <CalendarDays size={19} />
        </IconButton>

        <div className="relative" ref={openPanel === 'clock' ? panelRef : undefined}>
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
    </nav>
  )
}
