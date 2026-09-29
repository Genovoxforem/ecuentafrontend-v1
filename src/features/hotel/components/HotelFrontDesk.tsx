import { useMemo, useState } from 'react'
import { LoaderCircle, LogIn, LogOut, Search, Ban, ArrowRightLeft, CalendarClock } from 'lucide-react'
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
  useHotelCancelBooking,
  useHotelMoveRoom,
  useHotelEditDates,
  useHotelToken,
  useHotelDashboard,
  type HotelArrival,
} from '../hotel.queries'
import { useConfirm } from '../../../shared/components/ConfirmDialog'

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

// a=cancel — cancels a booking not yet checked in (Arrivals / Upcoming).
function CancelBookingButton({ num, onDone }: { num: string; onDone: () => void }) {
  const confirm = useConfirm()
  const { data: token } = useHotelToken()
  const cancel = useHotelCancelBooking()
  return (
    <button
      type="button"
      disabled={!token || cancel.isPending}
      onClick={async () => {
        if (token && (await confirm(`Cancel booking ${num}? This cannot be undone.`))) {
          cancel.mutate({ booking: num, token }, { onSuccess: onDone })
        }
      }}
      title="Cancel booking"
      className="flex items-center gap-1 text-xs font-medium text-danger-fg rounded-md px-2 py-1.5 hover:bg-danger-bg disabled:opacity-50"
    >
      {cancel.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <Ban size={12} />} Cancel
    </button>
  )
}

// a=move — moves an in-house guest to a different suite. Reuses the same
// r=available room list AssignAndCheckIn already fetches for arrivals.
function MoveRoomAction({ num, onDone }: { num: string; onDone: () => void }) {
  const { data: token } = useHotelToken()
  const today = new Date().toISOString().slice(0, 10)
  const { data: available } = useHotelAvailable(today, today)
  const move = useHotelMoveRoom()
  const [open, setOpen] = useState(false)
  const [room, setRoom] = useState('')

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} title="Move to another suite" className="flex items-center gap-1 text-xs text-text-muted rounded-md px-2 py-1.5 hover:bg-surface-hover">
        <ArrowRightLeft size={12} /> Move
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-8 text-xs rounded-md border border-input-border bg-input-bg text-text px-2">
        <option value="">New suite…</option>
        {(available ?? []).slice(0, 20).map((r) => (
          <option key={r.id} value={r.id}>
            {r.no} · {r.type}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!token || !room || move.isPending}
        onClick={() => token && move.mutate({ booking: num, to: room, token }, { onSuccess: () => (setOpen(false), setRoom(''), onDone()) })}
        className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover disabled:opacity-50"
      >
        {move.isPending ? <LoaderCircle size={12} className="animate-spin" /> : 'Move'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-faint hover:text-text-muted px-1">
        Cancel
      </button>
    </div>
  )
}

// a=editdates — edits a booking's check-in/check-out dates (e.g. extending
// an in-house stay).
function EditDatesAction({ num, checkIn, checkOut, onDone }: { num: string; checkIn: string; checkOut: string; onDone: () => void }) {
  const { data: token } = useHotelToken()
  const editDates = useHotelEditDates()
  const [open, setOpen] = useState(false)
  const [ci, setCi] = useState(checkIn)
  const [co, setCo] = useState(checkOut)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setCi(checkIn)
          setCo(checkOut)
          setOpen(true)
        }}
        title="Edit stay dates"
        className="flex items-center gap-1 text-xs text-text-muted rounded-md px-2 py-1.5 hover:bg-surface-hover"
      >
        <CalendarClock size={12} /> Dates
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={ci} onChange={(e) => setCi(e.target.value)} className="h-8 text-xs rounded-md border border-input-border bg-input-bg text-text px-2" />
      <input type="date" value={co} onChange={(e) => setCo(e.target.value)} className="h-8 text-xs rounded-md border border-input-border bg-input-bg text-text px-2" />
      <button
        type="button"
        disabled={!token || !ci || !co || editDates.isPending}
        onClick={() => token && editDates.mutate({ booking: num, ci, co, token }, { onSuccess: () => (setOpen(false), onDone()) })}
        className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover disabled:opacity-50"
      >
        {editDates.isPending ? <LoaderCircle size={12} className="animate-spin" /> : 'Save'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-faint hover:text-text-muted px-1">
        Cancel
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

// Stat cards reuse r=dashboard's fields. Each tab's search box filters
// already-fetched data client-side. Check-out opens the multi-step
// HotelCheckoutWizard; the old direct a=checkout survives as its "Force
// check out anyway" escape hatch.
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
                  <div className="flex items-center gap-1.5">
                    <AssignAndCheckIn guest={g} onDone={() => arrivals.refetch()} />
                    <CancelBookingButton num={g.num} onDone={() => arrivals.refetch()} />
                  </div>
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
                    <MoveRoomAction num={g.num} onDone={() => inhouse.refetch()} />
                    <EditDatesAction num={g.num} checkIn="" checkOut={g.co} onDone={() => inhouse.refetch()} />
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
                >
                  <CancelBookingButton num={g.num} onDone={() => upcoming.refetch()} />
                </GuestRow>
              ))
            )}
          </>
        )}

        {tab === 'out' && (
          <>
            {filteredCheckouts.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{q ? 'No checkouts match this search.' : 'No checkouts yet.'}</p>
            ) : (
              <div className="overflow-auto no-scrollbar">
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
