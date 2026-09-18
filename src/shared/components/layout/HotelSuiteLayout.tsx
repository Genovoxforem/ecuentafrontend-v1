import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { BedDouble, LogOut, ArrowLeft } from 'lucide-react'
import { HOTEL_SUITE_NAV, HOTEL_SUITE_PAGE_BY_PATH } from '../../../features/hotel/hotelSuiteNav'
import { useAuth } from '../../../features/auth/AuthContext'
import { ROUTES } from '../../../routes'

// Real Hotel Suite pages (custom/hotel/app.php) get their own persistent
// nested sidebar here, matching the real Suite's own internal nav structure
// (confirmed live: it's a genuinely separate SPA-within-the-app, distinct
// from this app's own outer sidebar tree) — see hotelSuiteNav.ts for the
// item list and the two deliberate real-equivalent mappings. Classic
// Dolibarr hotel pages (Room Settings, Add Room, Add/List Tenant, the
// classic Booking/Check-In List, Invoice List, etc.) stay outside this
// layout and keep using only the outer sidebar, since they're genuinely not
// part of the Suite.
//
// Mounted as its own top-level route in App.tsx (outside AppLayout, same
// tier as /pos) rather than nested inside the main app's Navbar/Sidebar —
// the real Suite is its own standalone app, so this now gets the same
// full-bleed, own-chrome treatment POS gets, per explicit request. Every
// entry point (Room Status, Booking Management's own header, Home's "Hotel
// Dashboard" link, the Suite's own Dashboard tab) lands here directly.
export function HotelSuiteLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Same session as the main app — logging out here logs out there too,
  // and lands back on the main app's own /login. Mirrors PosLayout's own
  // DashboardLayout (src/pos/layouts/DashboardLayout.jsx): now that this
  // layout has no main app Navbar around it, its own sidebar needs to carry
  // logout itself, same reason POS's own PosSidebar does.
  function handleLogout() {
    logout()
    navigate(ROUTES.login)
  }

  const page = HOTEL_SUITE_PAGE_BY_PATH[location.pathname]
  const initials = user ? `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase() || user.login.slice(0, 2).toUpperCase() : ''

  return (
    // h-screen (not flex-1) because there's no longer an AppShell ancestor
    // supplying a bounded flex row to grow into — this is now its own
    // top-level page, so it has to size itself off the viewport directly,
    // same as PosLayout's own DashboardLayout (src/pos/layouts/
    // DashboardLayout.jsx). The aside is then a plain h-full column inside
    // that fixed-height row — no sticky/max-height math needed. Only the
    // content pane scrolls internally; the sidebar simply never moves.
    <div className="h-screen flex overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-alt h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <span className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-brand/10 text-brand">
            <BedDouble size={16} />
          </span>
          <span className="text-sm font-bold text-text!">Hotel Suite</span>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-4">
          {HOTEL_SUITE_NAV.map((group) => (
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
        {/* Matches the real Suite's own per-view <header class="topbar"> (Back
            + h1 title + subtitle + "Live data" pill + avatar, confirmed by
            reading custom/hotel/app.php's own markup directly) — styled with
            this app's own tokens rather than the real page's cream/gold
            theme. Centralized here (driven by hotelSuiteNav.ts's per-item
            subtitle) instead of each page rendering its own duplicate
            icon+title block. The real page has no footer element at all —
            "footer space" below is just consistent bottom padding on the
            scroll pane (pb-12 vs the usual p-6), not a fabricated footer bar. */}
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
        {/* flex flex-col here (mirrors AppShell's own scroll container) lets a
            page opt into flex-1 to fill this pane's full height instead of
            shrinking to its own content — e.g. HotelGuests.tsx's own
            "-m-6 flex-1 flex flex-col min-h-0" root, which otherwise has no
            flex parent to size against and was leaving a blank gap below its
            table on short result sets. */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar p-6 pb-12">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
