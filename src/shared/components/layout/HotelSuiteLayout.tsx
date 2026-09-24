import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { BedDouble, LogOut, ArrowLeft, ShieldAlert } from 'lucide-react'
import { HOTEL_SUITE_NAV, HOTEL_SUITE_PAGE_BY_PATH } from '../../../features/hotel/hotelSuiteNav'
import { useHotelMe } from '../../../features/hotel/hotel.queries'
import { useAuth } from '../../../features/auth/AuthContext'
import { ROUTES } from '../../../routes'

// Nested sidebar for the real Hotel Suite SPA (custom/hotel/app.php), kept
// separate from the classic Dolibarr hotel pages' outer sidebar. Mounted as
// its own top-level route in App.tsx (outside AppLayout, same tier as /pos).
export function HotelSuiteLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Real RBAC (app.php's applyRbac()): r=me returns {admin, m:{navKey:1,...}}
  // — a non-admin only sees/reaches views their m[navKey] is truthy for.
  const { data: me } = useHotelMe()
  const isAdmin = !me || me.admin === 1
  const canView = (navKey: string) => isAdmin || !!me?.m[navKey]
  const visibleNavGroups = HOTEL_SUITE_NAV.map((group) => ({ ...group, items: group.items.filter((item) => canView(item.navKey)) })).filter(
    (group) => group.items.length > 0,
  )
  const firstAllowedPath = visibleNavGroups[0]?.items[0]?.path

  // Same session as the main app — logs out there too.
  function handleLogout() {
    logout()
    navigate(ROUTES.login)
  }

  const page = HOTEL_SUITE_PAGE_BY_PATH[location.pathname]
  const initials = user ? `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase() || user.login.slice(0, 2).toUpperCase() : ''

  // Mirrors show(v)'s real redirect: an unpermitted view bounces to the first permitted one.
  const blocked = !!page && !canView(page.navKey)
  useEffect(() => {
    if (blocked && firstAllowedPath && firstAllowedPath !== location.pathname) navigate(firstAllowedPath, { replace: true })
  }, [blocked, firstAllowedPath, location.pathname, navigate])

  return (
    // h-screen (not flex-1): a top-level route with no AppShell ancestor to size against.
    <div className="h-screen flex overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-alt h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <span className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-brand/10 text-brand">
            <BedDouble size={16} />
          </span>
          <span className="text-sm font-bold text-text!">Hotel Suite</span>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-4">
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold text-text-faint uppercase tracking-wider">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover hover:text-text!'
                      }`
                    }
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 p-3 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text!"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="truncate">Log Out</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Matches the real Suite's per-view topbar (Back + title + subtitle + Live data pill + avatar), driven by hotelSuiteNav.ts's per-item subtitle. */}
        <header className="shrink-0 flex items-center gap-4 px-6 py-4 border-b border-border bg-surface">
          <Link
            to={ROUTES.home}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text! rounded-lg border border-border px-3 py-1.5 hover:bg-surface-hover"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-text! truncate">{page?.title ?? page?.label ?? 'Hotel Suite'}</h1>
            {page && <p className="text-xs text-text-faint mt-0.5 truncate">{page.subtitle}</p>}
          </div>
          <span className="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-success-bg text-success-fg">
            <span className="w-1.5 h-1.5 rounded-full bg-success-fg" /> Live data
          </span>
          {user && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-brand/10 text-brand grid place-items-center text-xs font-bold" title={`${user.firstname} ${user.lastname}`}>
              {initials}
            </div>
          )}
        </header>
        {/* flex flex-col lets a page opt into flex-1 to fill this pane's full height (see HotelGuests.tsx). */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar p-6 pb-12">
          {visibleNavGroups.length === 0 ? (
            // Verbatim real message (app.php's own applyRbac(), read
            // directly) for a staff user with zero Hotel module permissions.
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-16">
              <ShieldAlert size={28} className="text-text-faint mb-1" />
              <p className="text-base font-semibold text-text!">No hotel access</p>
              <p className="text-sm text-text-faint max-w-sm">You have no Hotel menu permissions. Ask an administrator to grant them under Users &amp; Groups → Permissions → Hotel.</p>
            </div>
          ) : blocked ? null : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}
