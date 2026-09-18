import { useMemo, useState } from 'react'
import { BellRing, LoaderCircle, LogIn, LogOut, Search } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { HotelCheckoutWizard } from './HotelCheckoutWizard'
import {
  useHotelArrivals,
  useHotelInhouse,
  useHotelUpcoming,
  useHotelCheckouts,
  useHotelAvailable,
  useHotelCheckIn,
  useHotelToken,
  useHotelDashboard,
  type HotelArrival,
} from '../hotel.queries'

type Tab = 'arr' | 'inh' | 'upc' | 'out'
const TAB_TITLE: Record<Tab, string> = {
  arr: "Today's arrivals",
  inh: 'In-house guests',
  upc: 'Upcoming arrivals',
  out: 'Checked-out guests',
}
const TAB_COUNT_LABEL: Record<Tab, string> = { arr: 'Arrivals', inh: 'In-house', upc: 'Upcoming', out: 'Checkouts' }

function AssignAndCheckIn({ guest, onDone }: { guest: HotelArrival; onDone: () => void }) {
  const { data: token } = useHotelToken()
  const today = new Date().toISOString().slice(0, 10)
  const { data: available } = useHotelAvailable(today, today)
  const checkIn = useHotelCheckIn()
  const [room, setRoom] = useState('')

  if (guest.rooms) {
    return (
      <button
        type="button"
        disabled={!token || checkIn.isPending}
        onClick={() => token && checkIn.mutate({ booking: guest.num, token }, { onSuccess: onDone })}
        className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover disabled:opacity-50"
      >
        {checkIn.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <LogIn size={12} />} Check in — Suite {guest.rooms}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-8 text-xs rounded-md border border-input-border bg-input-bg text-text px-2">
        <option value="">Assign suite…</option>
        {(available ?? []).slice(0, 20).map((r) => (
          <option key={r.id} value={r.id}>
            {r.no} · {r.type}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!token || !room || checkIn.isPending}
        onClick={() => token && checkIn.mutate({ booking: guest.num, room, token }, { onSuccess: onDone })}
        className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover disabled:opacity-50"
      >
        {checkIn.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <LogIn size={12} />} Check in
      </button>
    </div>
  )
}

function GuestRow({ children, guest, meta }: { children?: React.ReactNode; guest: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span className={`shrink-0 w-9 h-9 rounded-full grid place-items-center text-xs font-bold ${ICON_STYLES[avatarColorFor(guest)]}`}>{initialsFor(guest)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text!">{guest || 'Guest'}</p>
        <p className="text-xs text-text-faint">{meta}</p>
      </div>
      {children}
    </div>
  )
}

// Real via custom/hotel/api.php?r=arrivals|inhouse|upcoming|checkouts|
// dashboard, plus a=checkin — the Hotel Suite app's own Front Desk. The 4
// top stat cards (Arrivals/Departures/In Residence/Vacant Ready) reuse
// r=dashboard's own real fields (arrivals/departures/inhouse/counts.ready —
// confirmed live: the real Front Desk tab shows exactly these 4). Each
// tab's own search box is a client-side filter over data already fetched
// (guest/booking/suite), matching the real page's own per-tab search —
// no separate search endpoint exists or is needed. Check-out now opens the
// real multi-step wizard (HotelCheckoutWizard.tsx: folio → generate invoice
// → finalize/ZRA → collect & apply payment → check out), reproducing the
// original SPA's own checkoutModal() instead of the earlier simplified
// direct a=checkout call — that simple contract is still there as the
// wizard's own "Force check out anyway" escape hatch.
export function HotelFrontDesk() {
  const [tab, setTab] = useState<Tab>('arr')
  const [search, setSearch] = useState('')
  const { data: token } = useHotelToken()
  const { data: dashboard } = useHotelDashboard()
  const arrivals = useHotelArrivals()
  const inhouse = useHotelInhouse()
  const upcoming = useHotelUpcoming()
  const checkouts = useHotelCheckouts()
  const [checkingOut, setCheckingOut] = useState<{ num: string; guest: string } | null>(null)

  const active = tab === 'arr' ? arrivals : tab === 'inh' ? inhouse : tab === 'upc' ? upcoming : checkouts

  const q = search.trim().toLowerCase()
  const filteredArrivals = useMemo(() => (arrivals.data ?? []).filter((g) => !q || `${g.num} ${g.guest} ${g.rooms}`.toLowerCase().includes(q)), [arrivals.data, q])
  const filteredInhouse = useMemo(() => (inhouse.data ?? []).filter((g) => !q || `${g.num} ${g.guest} ${g.rooms}`.toLowerCase().includes(q)), [inhouse.data, q])
  const filteredUpcoming = useMemo(() => (upcoming.data ?? []).filter((g) => !q || `${g.num} ${g.guest} ${g.rooms}`.toLowerCase().includes(q)), [upcoming.data, q])
  const filteredCheckouts = useMemo(() => (checkouts.data ?? []).filter((c) => !q || `${c.num} ${c.guest} ${c.rooms}`.toLowerCase().includes(q)), [checkouts.data, q])
  const activeCount = tab === 'arr' ? filteredArrivals.length : tab === 'inh' ? filteredInhouse.length : tab === 'upc' ? filteredUpcoming.length : filteredCheckouts.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <BellRing size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Front Desk</h2>
          <p className="text-xs text-text-faint mt-0.5">Arrivals, in-house guests and checkouts</p>
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="!p-4">
            <p className="text-2xl font-bold text-text!">{dashboard.arrivals}</p>
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mt-1">Arrivals</p>
          </Card>
          <Card className="!p-4">
            <p className="text-2xl font-bold text-text!">{dashboard.departures}</p>
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mt-1">Departures</p>
          </Card>
          <Card className="!p-4">
            <p className="text-2xl font-bold text-text!">{dashboard.inhouse}</p>
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mt-1">In residence</p>
          </Card>
          <Card className="!p-4">
            <p className="text-2xl font-bold text-text!">{dashboard.counts.ready}</p>
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mt-1">Vacant ready</p>
          </Card>
        </div>
      )}

      <div className="flex gap-5 border-b border-border">
        {(
          [
            ['arr', 'Arrivals'],
            ['inh', 'In-house & departures'],
            ['upc', 'Upcoming'],
            ['out', 'Checked out'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'text-text! border-brand' : 'text-text-faint border-transparent hover:text-text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {active.isLoading && <LegacyLoadingCard label="Loading…" />}
      {active.isError && <LegacyErrorCard title="Couldn't load" message={active.error instanceof Error ? active.error.message : 'Unknown error.'} onRetry={() => active.refetch()} />}

      <Card className="!h-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text!">{TAB_TITLE[tab]}</h3>
            <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">
              {activeCount} {TAB_COUNT_LABEL[tab]}
            </span>
          </div>
          <label className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by guest, booking, suite or date"
              className="w-72 h-9 pl-9 pr-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
        </div>

        {tab === 'arr' && (
          <>
            {filteredArrivals.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{q ? 'No arrivals match this search.' : 'No arrivals today.'}</p>
            ) : (
              filteredArrivals.map((g) => (
                <GuestRow key={g.num} guest={g.guest} meta={`${g.btype || ''} · ETA ${g.eta}`}>
                  <AssignAndCheckIn guest={g} onDone={() => arrivals.refetch()} />
                </GuestRow>
              ))
            )}
          </>
        )}

        {tab === 'inh' && (
          <>
            {filteredInhouse.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{q ? 'No in-house guests match this search.' : 'No in-house guests.'}</p>
            ) : (
              filteredInhouse.map((g) => (
                <GuestRow key={g.num} guest={g.guest} meta={`Suite ${g.rooms || '—'} · out ${g.co}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">K{Number(g.bal).toLocaleString()}</span>
                    <button
                      type="button"
                      disabled={!token}
                      onClick={() => setCheckingOut({ num: g.num, guest: g.guest })}
                      className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover disabled:opacity-50"
                    >
                      <LogOut size={12} /> Check out
                    </button>
                  </div>
                </GuestRow>
              ))
            )}
          </>
        )}

        {tab === 'upc' && (
          <>
            {filteredUpcoming.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{q ? 'No upcoming arrivals match this search.' : 'No upcoming arrivals.'}</p>
            ) : (
              filteredUpcoming.map((g) => (
                <GuestRow
                  key={g.num}
                  guest={g.guest}
                  meta={`${g.btype || ''} · ${g.cidate}${g.rooms ? ` · Suite ${g.rooms}` : ''} · ${g.din <= 1 ? 'tomorrow' : `in ${g.din} days`}`}
                />
              ))
            )}
          </>
        )}

        {tab === 'out' && (
          <>
            {filteredCheckouts.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{q ? 'No checkouts match this search.' : 'No checkouts yet.'}</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-2 py-2">Booking</th>
                      <th className="font-medium px-2 py-2">Guest</th>
                      <th className="font-medium px-2 py-2">Suite(s)</th>
                      <th className="font-medium px-2 py-2">Stay</th>
                      <th className="font-medium px-2 py-2">Checked out</th>
                      <th className="font-medium px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCheckouts.map((c) => (
                      <tr key={c.num} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 text-text! font-medium">{c.num}</td>
                        <td className="px-2 py-2 text-text-muted">{c.guest || '—'}</td>
                        <td className="px-2 py-2 text-text-muted">{c.rooms || '—'}</td>
                        <td className="px-2 py-2 text-text-muted">
                          {c.ci} → {c.co}
                        </td>
                        <td className="px-2 py-2 text-text-muted">{c.cout || '—'}</td>
                        <td className="px-2 py-2 text-right text-text!">K{Number(c.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>

      {checkingOut && (
        <HotelCheckoutWizard
          booking={checkingOut.num}
          guest={checkingOut.guest}
          onClose={() => setCheckingOut(null)}
          onDone={() => {
            setCheckingOut(null)
            inhouse.refetch()
            checkouts.refetch()
          }}
        />
      )}
    </div>
  )
}
