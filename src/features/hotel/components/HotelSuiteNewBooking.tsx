import { useCallback, useMemo, useState } from 'react'
import { CalendarPlus, Check, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelAvailable, useHotelBookingPlans, useHotelCustomerSearch, useHotelCreateBooking, useHotelToken } from '../hotel.queries'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const labelCls = 'text-xs font-semibold text-text-faint uppercase tracking-wide'

const COUNTRIES = [
  { id: '239', name: 'Zambia' },
  { id: '205', name: 'South Africa' },
  { id: '240', name: 'Zimbabwe' },
  { id: '144', name: 'Malawi' },
  { id: '215', name: 'Tanzania' },
  { id: '126', name: 'Kenya' },
  { id: '73', name: 'DR Congo' },
  { id: '54', name: 'Botswana' },
  { id: '161', name: 'Namibia' },
  { id: '159', name: 'Mozambique' },
  { id: '225', name: 'Uganda' },
  { id: '189', name: 'Rwanda' },
  { id: '169', name: 'Nigeria' },
  { id: '7', name: 'United Kingdom' },
  { id: '11', name: 'United States' },
  { id: '117', name: 'India' },
  { id: '9', name: 'China' },
  { id: '5', name: 'Germany' },
  { id: '1', name: 'France' },
  { id: '227', name: 'UAE' },
  { id: '28', name: 'Australia' },
  { id: '14', name: 'Canada' },
]

function todayIso(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Real via custom/hotel/api.php?r=available|bookingplans|customers and
// a=createbooking — the Hotel Suite's own internal "New Booking" tab
// (custom/hotel/app.php#newbook, confirmed live: Guest search + "+ Add new
// guest" toggle, Arrival From/Purpose, Check-In/Check-Out as plain dates,
// Rate plan/source populated from real bookingplans, tap-to-add suite
// tiles, Summary with Suites/Nights/Tourism levy (1.5%)/Estimated total/
// Discount/Advance/Balance due). Distinct from HotelNewBooking.tsx, which
// deliberately matches the classic booking.php form instead (the outer
// sidebar's own "Booking/Check-In List" → "+ Add" button leads there, a
// separate real page — see that file's own top comment). Per-room
// occupancy/extra-bed/add-on-service fields (rmeta/rsvc — real accepted
// params, confirmed by reading the Suite's own nbCalc()/doCreate() JS
// directly) only ever appear once a suite tile is actually tapped, which
// can't happen right now since r=available returns zero rooms on this
// backend (same root cause documented in HotelAddRoomPage.tsx) — so that
// per-room config panel isn't built here; Suites/Nights/Tourism levy/Total
// stay real but necessarily 0 until real inventory exists.
export function HotelSuiteNewBooking() {
  const { data: token } = useHotelToken()
  const { data: plans } = useHotelBookingPlans()
  const [checkIn, setCheckIn] = useState(todayIso())
  const [checkOut, setCheckOut] = useState(todayIso(1))
  const [source, setSource] = useState('')
  const [guestQuery, setGuestQuery] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [addingNewGuest, setAddingNewGuest] = useState(false)
  const [gEmail, setGEmail] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gAddr, setGAddr] = useState('')
  const [gZip, setGZip] = useState('')
  const [gTown, setGTown] = useState('')
  const [gCountry, setGCountry] = useState('239')
  const [gTpin, setGTpin] = useState('')
  const [gIdNo, setGIdNo] = useState('')
  const [arrivalFrom, setArrivalFrom] = useState('')
  const [purpose, setPurpose] = useState('')
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set())
  const [discount, setDiscount] = useState('0')
  const [advance, setAdvance] = useState('0')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: available } = useHotelAvailable(checkIn, checkOut)
  const { data: customerResults } = useHotelCustomerSearch(guestQuery)
  const createBooking = useHotelCreateBooking()

  const selectedPlan = plans?.find((p) => p.name === source)

  const nights = useMemo(() => {
    const n = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    return n > 0 ? n : 1
  }, [checkIn, checkOut])

  const priceFor = useCallback(
    (r: { lv1: number; lv2: number; lv3: number; lv4: number }): number => {
      const lvl = selectedPlan?.level ?? 1
      const byLevel = (r as unknown as Record<string, number>)[`lv${lvl}`]
      return byLevel || r.lv1 || 0
    },
    [selectedPlan],
  )

  const { subtotal, tourismLevy } = useMemo(() => {
    let sum = 0
    let tl = 0
    for (const id of selectedRooms) {
      const r = available?.find((x) => x.id === id)
      if (!r) continue
      const price = priceFor(r)
      sum += price * nights
      tl += price * nights * (r.tlrate || 0.015)
    }
    return { subtotal: sum, tourismLevy: tl }
  }, [selectedRooms, available, nights, priceFor])

  const disc = Math.min(subtotal, Number(discount) || 0)
  const total = Math.max(0, Math.round((subtotal - disc + tourismLevy) * 100) / 100)
  const balanceDue = Math.max(0, total - (Number(advance) || 0))

  function toggleRoom(id: string) {
    setSelectedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleNewGuest() {
    setAddingNewGuest((v) => !v)
    setCustomerId('')
  }

  function handleCreate() {
    setError('')
    setSuccess('')
    if (!guestQuery.trim()) return setError('Guest is required.')
    if (!token) return setError('Not ready yet — try again in a moment.')

    createBooking.mutate(
      {
        guest: guestQuery.trim(),
        checkin: checkIn,
        checkout: checkOut,
        rooms: Array.from(selectedRooms).join(','),
        source: source || 'Direct',
        customer_id: customerId || undefined,
        arrival_from: arrivalFrom || undefined,
        purpose: purpose || undefined,
        gemail: addingNewGuest ? gEmail : undefined,
        gphone: addingNewGuest ? gPhone : undefined,
        gaddr: addingNewGuest ? gAddr : undefined,
        gzip: addingNewGuest ? gZip : undefined,
        gtown: addingNewGuest ? gTown : undefined,
        gcountry: addingNewGuest ? gCountry : undefined,
        gtpin: addingNewGuest ? gTpin : undefined,
        gidno: addingNewGuest ? gIdNo : undefined,
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
          setAddingNewGuest(false)
          setArrivalFrom('')
          setPurpose('')
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
          <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">Create a reservation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <Card className="!h-auto space-y-4">
          <h3 className="font-semibold text-text!">New Reservation</h3>

          <div className="space-y-3">
            <label className="flex flex-col gap-1 relative">
              <span className={labelCls}>Guest *</span>
              <input
                value={guestQuery}
                onChange={(e) => {
                  setGuestQuery(e.target.value)
                  if (!addingNewGuest) setCustomerId('')
                }}
                placeholder={addingNewGuest ? 'New guest full name' : 'Search guest by name / phone / email'}
                className={inputCls}
              />
              {!addingNewGuest && guestQuery.trim().length >= 2 && !customerId && customerResults && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
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
            <button
              type="button"
              onClick={toggleNewGuest}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
            >
              {addingNewGuest ? 'Cancel new guest' : '+ Add new guest'}
            </button>

            {addingNewGuest && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-3">
                <input value={gEmail} onChange={(e) => setGEmail(e.target.value)} placeholder="Email *" className={inputCls} />
                <input value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="Phone *" className={inputCls} />
                <input value={gAddr} onChange={(e) => setGAddr(e.target.value)} placeholder="Address" className={`${inputCls} sm:col-span-2`} />
                <input value={gZip} onChange={(e) => setGZip(e.target.value)} placeholder="ZIP" className={inputCls} />
                <input value={gTown} onChange={(e) => setGTown(e.target.value)} placeholder="Town / City" className={inputCls} />
                <select value={gCountry} onChange={(e) => setGCountry(e.target.value)} className={`${inputCls} sm:col-span-2`}>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  value={gTpin}
                  onChange={(e) => setGTpin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="TPIN / Tax ID (10 digits) *"
                  inputMode="numeric"
                  className={inputCls}
                />
                <input value={gIdNo} onChange={(e) => setGIdNo(e.target.value)} placeholder="ID / Passport no." className={inputCls} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Arrival from</span>
              <input value={arrivalFrom} onChange={(e) => setArrivalFrom(e.target.value)} placeholder="City / airport" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Purpose</span>
              <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Business / leisure" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Check-in</span>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Check-out</span>
              <input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelCls}>Rate plan / source</span>
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
                    <option value="Corporate">Corporate (-15%)</option>
                    <option value="OTA">OTA (+15%)</option>
                  </>
                )}
              </select>
            </label>
          </div>

          <div>
            <p className={`${labelCls} mb-2`}>Select suites (tap to add)</p>
            {available && available.length === 0 ? (
              <p className="text-sm text-text-faint italic">No suites available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(available ?? []).map((r) => {
                  const on = selectedRooms.has(r.id)
                  const price = priceFor(r)
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Tourism levy (1.5%)</span>
            <span className="font-semibold text-text!">K{tourismLevy.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-base pt-2 border-t border-border">
            <span className="text-text-muted">Estimated total (incl. tax)</span>
            <span className="font-bold text-text!">K{total.toLocaleString()}</span>
          </div>
          <label className="flex items-center justify-between text-sm gap-2">
            <span className="text-text-muted">Discount (K)</span>
            <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24 h-8 text-right px-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </label>
          <label className="flex items-center justify-between text-sm gap-2">
            <span className="text-text-muted">Advance / deposit (K)</span>
            <input type="number" min={0} value={advance} onChange={(e) => setAdvance(e.target.value)} className="w-24 h-8 text-right px-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </label>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="text-text-muted">Balance due</span>
            <span className="font-semibold text-text!">K{balanceDue.toLocaleString()}</span>
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
