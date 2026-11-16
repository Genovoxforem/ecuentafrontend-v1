import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Plus, ShieldAlert, Sun } from 'lucide-react'
import { PHARMACY_NAV, PHARMACY_PAGE_BY_PATH, PHARMACY_VIEWS } from '../../../features/pharmacy/pharmacyNav'
import { usePharmacyMe, type PharmacyMe } from '../../../features/pharmacy/pharmacy.queries'
import { useAuth } from '../../../features/auth/AuthContext'
import { useZraServerStatus } from '../../../features/zra/zra.queries'
import { ToastHost } from '../../../features/pharmacy/components/PharmacyUi'
import { ROUTES } from '../../../routes'

const can = (me: PharmacyMe | undefined, [module, action]: [string, string]) => !me || me.admin || (me.rights?.[module] ?? []).includes(action)

// Own full-screen frame for the Pharmacy suite (custom/pharmacy/app.php): sidebar groups Operations / Inventory /
// Compliance, a per-page header, and a live/offline pill. Mounted outside AppLayout like the Hotel Suite.
// Rights come from api.php?m=me (admin sees everything); until it answers, nothing is hidden.
export function PharmacyLayout() {
  const { logout } = useAuth()
  // The suite keeps its own light/dark choice (as the classic app does under "pharmacy.appearance"), apart from the main app theme.
  const [dark, setDark] = useState(() => {
    try {
      const saved = window.localStorage.getItem('pharmacy.appearance')
      if (saved === 'light' || saved === 'dark') return saved === 'dark'
    } catch {
      /* storage blocked */
    }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches !== true
  })
  const toggleTheme = () =>
    setDark((d) => {
      try {
        window.localStorage.setItem('pharmacy.appearance', d ? 'light' : 'dark')
      } catch {
        /* storage blocked */
      }
      return !d
    })
  const [viewKey, setViewKey] = useState('all')
  const view = PHARMACY_VIEWS.find((v) => v.key === viewKey) ?? PHARMACY_VIEWS[0]
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const navigate = useNavigate()
  const location = useLocation()
  const { data: me, isError } = usePharmacyMe()
  // The sidebar's "ZRA fiscal" line is the real ZRA gateway check (the same one the ZRA dashboard shows), not fixed text.
  const zra = useZraServerStatus()
  const zraState = zra.data ? (zra.data.ok ? { word: 'online', cls: 'text-success-fg' } : { word: 'degraded', cls: 'text-warning-fg' }) : zra.isError ? { word: 'unreachable', cls: 'text-danger-fg' } : { word: 'checking', cls: 'text-text-faint' }

  const groups = PHARMACY_NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(me, i.right) && (view.paths === 'all' || view.paths.includes(i.path))) })).filter((g) => g.items.length > 0)
  const firstAllowed = groups[0]?.items[0]?.path
  const page = PHARMACY_PAGE_BY_PATH[location.pathname]
  const blocked = !!page && !can(me, page.right)

  useEffect(() => {
    if (blocked && firstAllowed && firstAllowed !== location.pathname) navigate(firstAllowed, { replace: true })
  }, [blocked, firstAllowed, location.pathname, navigate])

  if (location.pathname === '/pharmacy') return <Navigate to={ROUTES.pharmacyDashboard} replace />

  return (
    <div className={`pharmacy-app ${dark ? 'ph-dark' : 'ph-light'} h-screen flex overflow-hidden bg-surface`}>
      <div className="w-60 shrink-0 border-r border-border bg-surface-alt h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="shrink-0 w-10 h-10 rounded-xl grid place-items-center bg-linear-to-br from-[#14b890] to-[#0a6b52] text-white shadow">
            <Plus size={20} strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="font-serif text-lg font-semibold text-text!">Ecuenta</p>
            <p className="text-xs font-semibold tracking-[0.2em] text-text-faint uppercase">Pharmacy</p>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 pb-3 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-xs font-semibold text-text-faint uppercase tracking-[0.18em]">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'bg-linear-to-r from-[#0a7a5c] to-[#10a37f] text-white shadow-md' : 'text-text-muted hover:bg-surface-hover hover:text-text!'}`
                    }
                  >
                    <item.icon size={16} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 p-2 border-t border-border space-y-0.5">
          <Link to={ROUTES.home} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text!">
            <ArrowLeft size={16} className="shrink-0" /> <span className="truncate">Back to app</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate(ROUTES.login)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text!"
          >
            <LogOut size={16} className="shrink-0" />
            <span className="truncate">Log Out</span>
          </button>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 border-t border-border px-4 py-3 text-xs text-text-faint" title={zra.data ? `${zra.data.code ? zra.data.code + ' - ' : ''}${zra.data.message}` : zra.error instanceof Error ? zra.error.message : undefined}>
          <span className={zraState.cls}>●</span> ZRA fiscal <b className="text-text!">{zraState.word}</b>
        </div>
      </div>
      <ToastHost />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center gap-4 px-6 py-3 border-b border-border bg-surface">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-text! truncate">{page?.label ?? 'Pharmacy'}</h1>
            {page && <p className="text-xs text-text-faint truncate">{page.subtitle} · {today}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isError && <span className="text-xs text-danger-fg" title="The pharmacy service did not answer (needs the legacy session)">Offline</span>}
            <select
              value={view.key}
              onChange={(e) => setViewKey(e.target.value)}
              aria-label="Staff view"
              title="Staff view: filters the menu to a role"
              className="h-9 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text outline-none"
            >
              {PHARMACY_VIEWS.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
            <button type="button" aria-label="Toggle theme" onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-lg border border-input-border bg-input-bg text-text hover:bg-surface-hover">
              <Sun size={16} />
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar p-6 pb-6">
          {groups.length === 0 && me ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-16">
              <ShieldAlert size={28} className="text-text-faint mb-1" />
              <p className="text-base font-semibold text-text!">No pharmacy access</p>
              <p className="text-sm text-text-faint max-w-sm">You have no Pharmacy permissions. Ask an administrator to grant them.</p>
            </div>
          ) : blocked ? null : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}
