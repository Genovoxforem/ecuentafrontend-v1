import { useCallback, useMemo, useState } from 'react'
import { Check, LoaderCircle, Search, MapPin, Tag, CalendarDays, UserPlus, UserRound, BedDouble, Info, Moon, ArrowLeft, ArrowRight, Users2, Sparkles, ClipboardCheck } from 'lucide-react'
import { Card, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import {
  useHotelAvailable,
  useHotelBookingPlans,
  useHotelCustomerSearch,
  useHotelCreateBooking,
  useHotelToken,
  useHotelFeatures,
  type HotelFeatureRow,
} from '../hotel.queries'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const iconInputCls = `${inputCls} pl-9`
const labelCls = 'text-xs font-semibold text-text-faint uppercase tracking-wide'
const fieldIconCls = 'absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none'

function fmtShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Real amount/tourism-levy math, ported line-for-line from the Suite's own
// nbSvcPrice()/nbTLamt() JS (custom/hotel/app.php, read directly): a
// service's price prefers amount_ttc over amount, and the levy is
// round(price * rate) / 100 — i.e. rate is a percentage number (e.g. 1.5),
// not a fraction, and only contributes when > 0. Getting this formula wrong
// would make the wizard's totals diverge from what the real backend charges.
function svcPrice(f: HotelFeatureRow): number {
  const v = f.amount_ttc != null ? f.amount_ttc : f.amount
  return Number(v) || 0
}
function tlAmt(price: number, rate: unknown): number {
  const r = Number(rate) || 0
  return r > 0 ? Math.round(price * r) / 100 : 0
}

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

type RoomCfg = { adults: number; children: number; extraBeds: number }
const DEFAULT_ROOM_CFG: RoomCfg = { adults: 2, children: 0, extraBeds: 0 }

const STEPS = [
  { n: 1 as const, label: 'Guest & Details', hint: 'Enter guest information and basic booking details.' },
  { n: 2 as const, label: 'Select Suites', hint: 'Tap the suites you want to book for these dates.' },
  { n: 3 as const, label: 'Occupancy & Services', hint: 'Set adults/children/extra beds and add any services per suite.' },
  { n: 4 as const, label: 'Review & Confirm', hint: 'Check everything, apply a discount/advance, then create the reservation.' },
]
type StepNum = (typeof STEPS)[number]['n']

function Stepper({ step }: { step: StepNum }) {
  return (
    <div className="flex items-center flex-wrap gap-y-2">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                step === s.n ? 'bg-brand text-white' : step > s.n ? 'bg-brand/15 text-brand' : 'bg-surface-hover text-text-faint'
              }`}
            >
              {step > s.n ? <Check size={14} /> : s.n}
            </span>
            <span className={`hidden sm:inline text-sm font-medium ${step === s.n ? 'text-text!' : 'text-text-faint'}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`w-6 sm:w-10 h-px mx-2 sm:mx-3 transition-colors ${step > s.n ? 'bg-brand/40' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

// Real via custom/hotel/api.php?r=available|bookingplans|customers|features
// and a=createbooking — the Hotel Suite's own internal "New Booking" tab
// (custom/hotel/app.php#newbook). The real page itself is a single scrolling
// form, not a wizard — this deliberately restructures it into 4 steps
// (Guest → Suites → Occupancy & Services → Review) per explicit request, but
// every field/value/format below was re-confirmed by reading that page's own
// live nbInit()/nbCalc()/nbRoomCfg()/doCreate() JS directly (not guessed):
// rmeta is `roomId:adults:children:extraBeds` joined by ',' across selected
// rooms; rsvc is `roomId=featureId1,featureId2` joined by ';', one segment
// per room that has at least one service selected (rooms with none are
// omitted entirely) — see svcPrice()/tlAmt() above for the matching amount
// math. Per-room occupancy/services couldn't be exercised end-to-end before
// this session since r=available returns zero rooms on this dev backend
// (same root cause documented in HotelAddRoomPage.tsx), but the wiring is
// real, not a placeholder.
export function HotelSuiteNewBooking() {
  const { data: token } = useHotelToken()
  const { data: plans } = useHotelBookingPlans()
  const { data: features } = useHotelFeatures()
  const [step, setStep] = useState<StepNum>(1)
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
  const [roomCfg, setRoomCfg] = useState<Record<string, RoomCfg>>({})
  const [svcSel, setSvcSel] = useState<Record<string, Set<string>>>({})
  const [discount, setDiscount] = useState('0')
  const [advance, setAdvance] = useState('0')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: available } = useHotelAvailable(checkIn, checkOut)
  const { data: customerResults } = useHotelCustomerSearch(guestQuery)
  const createBooking = useHotelCreateBooking()

  const selectedPlan = plans?.find((p) => p.name === source)
  const activeFeatures = useMemo(() => (features ?? []).filter((f) => Number(f.status) === 1), [features])

  const nights = useMemo(() => {
    const n = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    return n > 0 ? n : 1
  }, [checkIn, checkOut])

  const priceFor = useCallback(
    (r: { lv1: number; lv2: number; lv3: number; lv4: number; rate_ttc?: number; rate?: number }): number => {
      const lvl = selectedPlan?.level ?? 1
      let p = Number((r as unknown as Record<string, number>)[`lv${lvl}`]) || 0
      if (p <= 0) p = Number(r.lv1) || 0
      if (p <= 0) p = Number(r.rate_ttc) || 0
      if (p <= 0) p = Number(r.rate) || 0
      return p
    },
    [selectedPlan],
  )

  const { subtotal, tourismLevy, rmetaStr, rsvcStr } = useMemo(() => {
    let sum = 0
    let tl = 0
    const metaParts: string[] = []
    const svcParts: string[] = []
    for (const id of selectedRooms) {
      const r = available?.find((x) => x.id === id)
      if (!r) continue
      const cfg = roomCfg[id] ?? DEFAULT_ROOM_CFG
      const price = priceFor(r)
      const bedCharge = Number(r.bed_charge) || 0
      let svcCost = 0
      const sel = svcSel[id]
      if (sel && sel.size > 0) {
        const fids = Array.from(sel)
        svcParts.push(`${id}=${fids.join(',')}`)
        for (const fid of fids) {
          const f = activeFeatures.find((x) => String(x.id) === fid)
          if (f) {
            const fp = svcPrice(f)
            svcCost += fp
            tl += tlAmt(fp, f.tlrate)
          }
        }
      }
      sum += (price + bedCharge * cfg.extraBeds) * nights + svcCost
      tl += tlAmt(price, r.tlrate) * nights
      metaParts.push(`${id}:${cfg.adults}:${cfg.children}:${cfg.extraBeds}`)
    }
    return { subtotal: sum, tourismLevy: tl, rmetaStr: metaParts.join(','), rsvcStr: svcParts.join(';') }
  }, [selectedRooms, available, nights, priceFor, roomCfg, svcSel, activeFeatures])

  const disc = Math.min(subtotal, Number(discount) || 0)
  const total = Math.max(0, Math.round((subtotal - disc + tourismLevy) * 100) / 100)
  const balanceDue = Math.max(0, total - (Number(advance) || 0))

  function toggleRoom(id: string) {
    setSelectedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setRoomCfg((c) => {
          const n = { ...c }
          delete n[id]
          return n
        })
        setSvcSel((s) => {
          const n = { ...s }
          delete n[id]
          return n
        })
      } else {
        next.add(id)
        const room = available?.find((r) => r.id === id)
        const cap = room?.capacity || 2
        setRoomCfg((c) => ({ ...c, [id]: { adults: Math.min(DEFAULT_ROOM_CFG.adults, cap), children: 0, extraBeds: 0 } }))
      }
      return next
    })
  }

  function updateRoomCfg(id: string, patch: Partial<RoomCfg>) {
    setRoomCfg((c) => ({ ...c, [id]: { ...(c[id] ?? DEFAULT_ROOM_CFG), ...patch } }))
  }

  function toggleSvc(roomId: string, fid: string) {
    setSvcSel((s) => {
      const set = new Set(s[roomId] ?? [])
      if (set.has(fid)) set.delete(fid)
      else set.add(fid)
      return { ...s, [roomId]: set }
    })
  }

  function toggleNewGuest() {
    setAddingNewGuest((v) => !v)
    setCustomerId('')
  }

  function goNext() {
    setError('')
    if (step === 1) {
      if (!guestQuery.trim()) return setError('Guest is required.')
      setStep(2)
    } else if (step === 2) {
      if (selectedRooms.size === 0) return setError('Select at least one suite.')
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    }
  }

  function goBack() {
    setError('')
    setStep((s) => (s > 1 ? ((s - 1) as StepNum) : s))
  }

  function handleCreate() {
    setError('')
    setSuccess('')
    if (!guestQuery.trim()) return setError('Guest is required.')
    if (selectedRooms.size === 0) return setError('Select at least one suite.')
    if (!token) return setError('Not ready yet — try again in a moment.')

    createBooking.mutate(
      {
        guest: guestQuery.trim(),
        checkin: checkIn,
        checkout: checkOut,
        rooms: Array.from(selectedRooms).join(','),
        source: source || 'Direct',
        customer_id: customerId || undefined,
        rmeta: rmetaStr || undefined,
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
        rsvc: rsvcStr || undefined,
        token,
      },
      {
        onSuccess: (res) => {
          setSuccess(`Reservation ${res.booking as string} created.`)
          setSelectedRooms(new Set())
          setRoomCfg({})
          setSvcSel({})
          setGuestQuery('')
          setCustomerId('')
          setAddingNewGuest(false)
          setArrivalFrom('')
          setPurpose('')
          setDiscount('0')
          setAdvance('0')
          setStep(1)
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to create reservation.'),
      },
    )
  }

  const selectedRoomRows = Array.from(selectedRooms)
    .map((id) => available?.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-text!">New Reservation</h2>
          <p className="text-sm text-text-faint mt-0.5">{STEPS[step - 1].hint}</p>
        </div>
        <Stepper step={step} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <Card className="!h-auto space-y-5">
          {step === 1 && (
            <>
              <SectionHeading icon={UserRound}>Guest & Reservation Details</SectionHeading>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 items-start">
                  <label className="flex flex-col gap-1 relative flex-1 w-full">
                    <span className={labelCls}>Guest *</span>
                    <div className="relative">
                      <Search size={15} className={fieldIconCls} />
                      <input
                        value={guestQuery}
                        onChange={(e) => {
                          setGuestQuery(e.target.value)
                          if (!addingNewGuest) setCustomerId('')
                        }}
                        placeholder={addingNewGuest ? 'New guest full name' : 'Search guest by name / phone / email'}
                        className={iconInputCls}
                      />
                    </div>
                    {!addingNewGuest && guestQuery.trim().length >= 2 && !customerId && customerResults && customerResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-auto no-scrollbar">
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
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 sm:mt-[22px] text-xs font-semibold text-text hover:bg-surface-hover whitespace-nowrap"
                  >
                    <UserPlus size={14} className={addingNewGuest ? 'text-danger' : 'text-brand'} />
                    {addingNewGuest ? 'Cancel new guest' : 'Add New Guest'}
                  </button>
                </div>

                {addingNewGuest && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border bg-surface-alt p-3">
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
                  <div className="relative">
                    <MapPin size={15} className={fieldIconCls} />
                    <input value={arrivalFrom} onChange={(e) => setArrivalFrom(e.target.value)} placeholder="City / airport" className={iconInputCls} />
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelCls}>Purpose</span>
                  <div className="relative">
                    <Tag size={15} className={fieldIconCls} />
                    <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Business / leisure" className={iconInputCls} />
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelCls}>Check-in</span>
                  <div className="relative">
                    <CalendarDays size={15} className={fieldIconCls} />
                    <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={iconInputCls} />
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelCls}>Check-out</span>
                  <div className="relative">
                    <CalendarDays size={15} className={fieldIconCls} />
                    <input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className={iconInputCls} />
                  </div>
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className={labelCls}>Rate plan / source</span>
                  <div className="relative">
                    <Tag size={15} className={fieldIconCls} />
                    <select value={source} onChange={(e) => setSource(e.target.value)} className={iconInputCls}>
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
                  </div>
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <SectionHeading icon={BedDouble}>Select Suites</SectionHeading>
              {available && available.length === 0 ? (
                <p className="text-sm text-text-faint italic">No suites available for these dates.</p>
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
                        title={r.type}
                        className={`relative flex flex-col items-start gap-0.5 min-w-[104px] px-3 py-2 rounded-xl border-2 text-left transition-colors ${
                          on ? 'bg-brand text-white border-brand' : 'border-border text-text hover:border-brand/60 hover:bg-surface-hover'
                        }`}
                      >
                        {on && <Check size={12} className="absolute top-1.5 right-1.5" />}
                        <span className="text-sm font-semibold">{r.no}</span>
                        <span className={`text-xs ${on ? 'text-white/80' : 'text-text-faint'}`}>K{price.toLocaleString()}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <SectionHeading icon={Users2}>Occupancy & Services</SectionHeading>
              {selectedRoomRows.length === 0 ? (
                <p className="text-sm text-text-faint italic">No suites selected — go back and pick at least one suite.</p>
              ) : (
                <div className="space-y-4">
                  {selectedRoomRows.map((r) => {
                    const cfg = roomCfg[r.id] ?? DEFAULT_ROOM_CFG
                    const cap = r.capacity || 2
                    const sel = svcSel[r.id] ?? new Set<string>()
                    return (
                      <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <BedDouble size={14} className="text-brand shrink-0" />
                          <span className="font-semibold text-sm text-text!">{r.no}</span>
                          <span className="text-xs text-text-faint">{r.type}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <label className="flex items-center gap-1.5">
                            <span className="text-text-faint text-xs">Adults</span>
                            <input
                              type="number"
                              min={1}
                              value={cfg.adults}
                              onChange={(e) => {
                                const v = Math.max(1, Number(e.target.value) || 1)
                                updateRoomCfg(r.id, { adults: Math.min(v, cap) })
                              }}
                              title={`Max ${cap} adults`}
                              className="w-16 h-8 text-center px-1 rounded-md border border-input-border bg-input-bg text-text text-sm"
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <span className="text-text-faint text-xs">Children</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.children}
                              onChange={(e) => updateRoomCfg(r.id, { children: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-8 text-center px-1 rounded-md border border-input-border bg-input-bg text-text text-sm"
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <span className="text-text-faint text-xs">Extra beds</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.extraBeds}
                              onChange={(e) => updateRoomCfg(r.id, { extraBeds: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-8 text-center px-1 rounded-md border border-input-border bg-input-bg text-text text-sm"
                            />
                          </label>
                        </div>
                        {activeFeatures.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {activeFeatures.map((f) => {
                              const on = sel.has(String(f.id))
                              const price = svcPrice(f)
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => toggleSvc(r.id, String(f.id))}
                                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    on ? 'bg-brand text-white border-brand' : 'border-border text-text-muted hover:border-brand/60'
                                  }`}
                                >
                                  <Sparkles size={11} />
                                  {f.name}
                                  {price > 0 && <span className={on ? 'text-white/80' : 'text-text-faint'}>+K{price.toLocaleString()}</span>}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-text-faint italic">No services configured.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <SectionHeading icon={ClipboardCheck}>Review & Confirm</SectionHeading>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-faint">Guest</span>
                  <span className="font-medium text-text! text-right">{guestQuery.trim() || 'Not selected'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-faint">Dates</span>
                  <span className="font-medium text-text! text-right">
                    {fmtShortDate(checkIn)} – {fmtShortDate(checkOut)} ({nights} night{nights === 1 ? '' : 's'})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-faint">Rate plan</span>
                  <span className="font-medium text-text! text-right">{source || 'Not selected'}</span>
                </div>
                {arrivalFrom && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-faint">Arrival from</span>
                    <span className="font-medium text-text! text-right">{arrivalFrom}</span>
                  </div>
                )}
                {purpose && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-faint">Purpose</span>
                    <span className="font-medium text-text! text-right">{purpose}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-border">
                {selectedRoomRows.map((r) => {
                  const cfg = roomCfg[r.id] ?? DEFAULT_ROOM_CFG
                  const sel = Array.from(svcSel[r.id] ?? [])
                  const svcNames = sel.map((fid) => activeFeatures.find((f) => String(f.id) === fid)?.name).filter(Boolean)
                  return (
                    <div key={r.id} className="text-sm">
                      <span className="font-semibold text-text!">{r.no}</span>{' '}
                      <span className="text-text-faint">
                        — {cfg.adults} adult{cfg.adults === 1 ? '' : 's'}
                        {cfg.children > 0 ? `, ${cfg.children} child${cfg.children === 1 ? '' : 'ren'}` : ''}
                        {cfg.extraBeds > 0 ? `, ${cfg.extraBeds} extra bed${cfg.extraBeds === 1 ? '' : 's'}` : ''}
                        {svcNames.length > 0 ? ` · ${svcNames.join(', ')}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                <label className="flex flex-col gap-1">
                  <span className={labelCls}>Discount (K)</span>
                  <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelCls}>Advance / deposit (K)</span>
                  <input type="number" min={0} value={advance} onChange={(e) => setAdvance(e.target.value)} className={inputCls} />
                </label>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-0 disabled:pointer-events-none"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {error && <p className="text-xs text-danger flex-1 text-center px-2">{error}</p>}
            {success && (
              <p className="text-xs text-success-fg flex items-center gap-1 flex-1 justify-center px-2">
                <Check size={12} /> {success}
              </p>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={createBooking.isPending}
                onClick={handleCreate}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {createBooking.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create reservation
              </button>
            )}
          </div>
        </Card>

        <Card className="!h-auto space-y-3 lg:sticky lg:top-4">
          <h3 className="font-semibold text-text!">Booking Summary</h3>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt border border-border px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text!">
              <CalendarDays size={13} className="text-brand shrink-0" />
              {fmtShortDate(checkIn)} – {fmtShortDate(checkOut)}
            </span>
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
              <Moon size={11} /> {nights} Night{nights === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-faint">Guest</span>
              <span className="font-medium text-text! truncate max-w-[60%] text-right">{guestQuery.trim() || 'Not selected'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-faint">From</span>
              <span className="font-medium text-text! truncate max-w-[60%] text-right">{arrivalFrom.trim() || 'Not selected'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-faint">Rate Plan</span>
              <span className="font-medium text-text! truncate max-w-[60%] text-right">{source || 'Not selected'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-faint">Purpose</span>
              <span className="font-medium text-text! truncate max-w-[60%] text-right">{purpose || 'Not selected'}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Suites</span>
              <span className="font-semibold text-text!">{selectedRooms.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Nights</span>
              <span className="font-semibold text-text!">{nights}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Tourism levy</span>
              <span className="font-semibold text-text!">K{tourismLevy.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-base pt-2 border-t border-border">
              <span className="text-text-muted">Estimated total (incl. tax)</span>
              <span className="font-bold text-text!">K{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Discount</span>
            <span className="font-semibold text-text!">K{disc.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Advance / deposit</span>
            <span className="font-semibold text-text!">K{(Number(advance) || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="text-text-muted">Balance due</span>
            <span className="font-semibold text-text!">K{balanceDue.toLocaleString()}</span>
          </div>

          {step === 1 && (
            <div className="flex items-start gap-2 rounded-lg bg-info-bg text-info-fg text-xs px-3 py-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>You can select rooms and add services in the next steps.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
