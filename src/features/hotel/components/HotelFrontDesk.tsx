import { useState } from 'react'
import { BellRing, LoaderCircle, LogIn, LogOut } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import {
  useHotelArrivals,
  useHotelInhouse,
  useHotelUpcoming,
  useHotelCheckouts,
  useHotelAvailable,
  useHotelCheckIn,
  useHotelCheckOut,
  useHotelToken,
  type HotelArrival,
} from '../hotel.queries'

type Tab = 'arr' | 'inh' | 'upc' | 'out'

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

// Real via custom/hotel/api.php?r=arrivals|inhouse|upcoming|checkouts, plus
// a=checkin / a=checkout writes — the Hotel Suite app's own Front Desk.
// Check-out here uses the real simple contract (a=checkout, booking, force)
// rather than the full multi-step invoice/ZRA-finalize modal the original
// SPA offers — a real backend "outstanding balance" warning still surfaces
// via the confirm-to-force-checkout flow below.
export function HotelFrontDesk() {
  const [tab, setTab] = useState<Tab>('arr')
  const { data: token } = useHotelToken()
  const arrivals = useHotelArrivals()
  const inhouse = useHotelInhouse()
  const upcoming = useHotelUpcoming()
  const checkouts = useHotelCheckouts()
  const checkOut = useHotelCheckOut()
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  function handleCheckOut(num: string) {
    if (!token) return
    setCheckingOut(num)
    checkOut.mutate(
      { booking: num, token },
      {
        onSettled: () => setCheckingOut(null),
        onError: (e) => {
          const msg = e instanceof Error ? e.message : 'Failed'
          if (confirm(`${msg}\n\nCheck out anyway?`)) {
            setCheckingOut(num)
            checkOut.mutate({ booking: num, force: true, token }, { onSettled: () => setCheckingOut(null) })
          }
        },
      },
    )
  }

  const active = tab === 'arr' ? arrivals : tab === 'inh' ? inhouse : tab === 'upc' ? upcoming : checkouts

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
        {tab === 'arr' && (
          <>
            {(arrivals.data ?? []).length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No arrivals today.</p>
            ) : (
              (arrivals.data ?? []).map((g) => (
                <GuestRow key={g.num} guest={g.guest} meta={`${g.btype || ''} · ETA ${g.eta}`}>
                  <AssignAndCheckIn guest={g} onDone={() => arrivals.refetch()} />
                </GuestRow>
              ))
            )}
          </>
        )}

        {tab === 'inh' && (
          <>
            {(inhouse.data ?? []).length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No in-house guests.</p>
            ) : (
              (inhouse.data ?? []).map((g) => (
                <GuestRow key={g.num} guest={g.guest} meta={`Suite ${g.rooms || '—'} · out ${g.co}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">K{Number(g.bal).toLocaleString()}</span>
                    <button
                      type="button"
                      disabled={!token || checkingOut === g.num}
                      onClick={() => handleCheckOut(g.num)}
                      className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover disabled:opacity-50"
                    >
                      {checkingOut === g.num ? <LoaderCircle size={12} className="animate-spin" /> : <LogOut size={12} />} Check out
                    </button>
                  </div>
                </GuestRow>
              ))
            )}
          </>
        )}

        {tab === 'upc' && (
          <>
            {(upcoming.data ?? []).length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No upcoming arrivals.</p>
            ) : (
              (upcoming.data ?? []).map((g) => <GuestRow key={g.num} guest={g.guest} meta={`${g.btype || ''} · ETA ${g.eta}`} />)
            )}
          </>
        )}

        {tab === 'out' && (
          <>
            {(checkouts.data ?? []).length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No checkouts yet.</p>
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
                    {(checkouts.data ?? []).map((c) => (
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
    </div>
  )
}
