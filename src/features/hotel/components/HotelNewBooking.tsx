import { useMemo, useState } from 'react'
import { CalendarPlus, Check, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelAvailable, useHotelBookingPlans, useHotelCustomerSearch, useHotelCreateBooking, useHotelToken } from '../hotel.queries'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function todayIso(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Real via custom/hotel/api.php?r=available (room pricing/availability for
// the chosen dates) and a=createbooking — the Hotel Suite app's own "New
// Booking" form. Simplified from the original: per-suite occupancy/extra-bed
// and add-on services aren't wired here (those fields the real endpoint
// accepts stay unset/default) — everything sent is real, just a narrower
// slice of what the endpoint supports.
export function HotelNewBooking() {
  const { data: token } = useHotelToken()
  const { data: plans } = useHotelBookingPlans()
  const [checkIn, setCheckIn] = useState(todayIso())
  const [checkOut, setCheckOut] = useState(todayIso(1))
  const [source, setSource] = useState('Direct')
  const [guestQuery, setGuestQuery] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set())
  const [discount, setDiscount] = useState('0')
  const [advance, setAdvance] = useState('0')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: available } = useHotelAvailable(checkIn, checkOut)
  const { data: customerResults } = useHotelCustomerSearch(guestQuery)
  const createBooking = useHotelCreateBooking()

  const nights = useMemo(() => {
    const n = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    return n > 0 ? n : 1
  }, [checkIn, checkOut])

  const total = useMemo(() => {
    let sum = 0
    for (const id of selectedRooms) {
      const r = available?.find((x) => x.id === id)
      if (r) sum += (r.lv1 || r.rate_ttc || r.rate || 0) * nights
    }
    const disc = Math.min(sum, Number(discount) || 0)
    return Math.max(0, sum - disc)
  }, [selectedRooms, available, nights, discount])

  function toggleRoom(id: string) {
    setSelectedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCreate() {
    setError('')
    setSuccess('')
    if (!guestQuery.trim()) return setError('Guest name is required.')
    if (selectedRooms.size === 0) return setError('Select at least one suite.')
    if (!token) return setError('Not ready yet — try again in a moment.')

    createBooking.mutate(
      {
        guest: guestQuery.trim(),
        checkin: checkIn,
        checkout: checkOut,
        rooms: Array.from(selectedRooms).join(','),
        source,
        customer_id: customerId || undefined,
        disc: Number(discount) || 0,
        advance: Number(advance) || 0,
        token,
      },
      {
        onSuccess: (res) => {
          setSuccess(`Reservation ${res.booking as string} created.`)
          setSelectedRooms(new Set())
          setGuestQuery('')
          setCustomerId('')
          setDiscount('0')
          setAdvance('0')
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to create reservation.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <CalendarPlus size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">New Booking</h2>
          <p className="text-xs text-text-faint mt-0.5">Create a real reservation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <Card className="!h-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 sm:col-span-2 relative">
              <span className="text-sm text-danger">Guest *</span>
              <input
                value={guestQuery}
                onChange={(e) => {
                  setGuestQuery(e.target.value)
                  setCustomerId('')
                }}
                placeholder="Search guest by name / phone / email, or type a new name"
                className={inputCls}
              />
              {guestQuery.trim().length >= 2 && !customerId && customerResults && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {customerResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(r.id)
                        setGuestQuery(r.name)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover border-b border-border last:border-0"
                    >
                      <span className="font-medium text-text!">{r.name}</span>{' '}
                      <span className="text-text-faint text-xs">
                        {r.code} {r.phone ? `· ${r.phone}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Check-in</span>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Check-out</span>
              <input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm text-text-muted">Rate plan / source</span>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                {plans && plans.length > 0 ? (
                  plans.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Direct">Rack · Direct / Walk-in</option>
                    <option value="Corporate">Corporate</option>
                    <option value="OTA">OTA</option>
                  </>
                )}
              </select>
            </label>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-text-faint mb-2">Select suites (tap to add)</p>
            {available && available.length === 0 ? (
              <p className="text-sm text-text-faint italic">No suites available for these dates.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(available ?? []).map((r) => {
                  const on = selectedRooms.has(r.id)
                  const price = r.lv1 || r.rate_ttc || r.rate || 0
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRoom(r.id)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium ${on ? 'bg-brand text-white border-brand' : 'border-border text-text hover:border-brand'}`}
                      title={r.type}
                    >
                      {r.no} · K{price.toLocaleString()}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="!h-auto space-y-3">
          <h3 className="font-semibold text-text!">Summary</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Suites</span>
            <span className="font-semibold text-text!">{selectedRooms.size}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Nights</span>
            <span className="font-semibold text-text!">{nights}</span>
          </div>
          <label className="flex items-center justify-between text-sm gap-2">
            <span className="text-text-muted">Discount (K)</span>
            <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24 h-8 text-right px-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </label>
          <label className="flex items-center justify-between text-sm gap-2">
            <span className="text-text-muted">Advance / deposit (K)</span>
            <input type="number" min={0} value={advance} onChange={(e) => setAdvance(e.target.value)} className="w-24 h-8 text-right px-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </label>
          <div className="flex items-center justify-between text-base pt-2 border-t border-border">
            <span className="text-text-muted">Estimated total</span>
            <span className="font-bold text-text!">K{total.toLocaleString()}</span>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {success && (
            <p className="text-xs text-success-fg flex items-center gap-1">
              <Check size={12} /> {success}
            </p>
          )}
          <button
            type="button"
            disabled={createBooking.isPending}
            onClick={handleCreate}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createBooking.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create reservation
          </button>
        </Card>
      </div>
    </div>
  )
}
