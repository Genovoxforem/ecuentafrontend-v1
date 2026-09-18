import { Outlet, NavLink } from 'react-router-dom'
import { BedDouble } from 'lucide-react'
import { HOTEL_SUITE_NAV } from '../../../features/hotel/hotelSuiteNav'

// Real Hotel Suite pages (custom/hotel/app.php) get their own persistent
// nested sidebar here, matching the real Suite's own internal nav structure
// (confirmed live: it's a genuinely separate SPA-within-the-app, distinct
// from this app's own outer sidebar tree) — see hotelSuiteNav.ts for the
// item list and the two deliberate real-equivalent mappings. Classic
// Dolibarr hotel pages (Room Settings, Add Room, Add/List Tenant, the
// classic Booking/Check-In List, Invoice List, etc.) stay outside this
// layout and keep using only the outer sidebar, since they're genuinely not
// part of the Suite. Follows the same pathless-layout-route pattern this
// app's own AppLayout already uses (element with no path, wrapping an
// <Outlet/>) — see App.tsx's own AppLayout for the precedent.
export function HotelSuiteLayout() {
  return (
    <div className="-m-6 flex items-start min-h-[calc(100%+3rem)]">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-alt sticky top-0 self-start max-h-screen overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <span className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-brand/10 text-brand">
            <BedDouble size={16} />
          </span>
          <span className="text-sm font-bold text-text!">Hotel Suite</span>
        </div>
        <nav className="p-3 space-y-4">
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
      </aside>
      <div className="flex-1 min-w-0 p-6">
        <Outlet />
      </div>
    </div>
  )
}
