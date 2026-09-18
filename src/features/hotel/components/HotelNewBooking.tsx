import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BedDouble, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Coins, Copy, Gift, Info, LoaderCircle, Plus, Search, Trash2, User, UserCheck, Users, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { getPageNumbers } from '../../../shared/components/ListPagination'
import { ROUTES } from '../../../routes'
import { useHotelBookingFormOptions, useHotelCustomerSearch, useHotelRoomsForSelect, useHotelCreateClassicBooking, type CreateClassicBookingInput } from '../hotel.queries'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const labelCls = 'text-sm text-text-muted'
const reqCls = 'text-sm text-danger'

function todayDisplay(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

function labelFor(list: { value: string; text: string }[] | undefined, value: string): string {
  return list?.find((o) => o.value === value)?.text ?? (value || '—')
}

let roomRowSeq = 0
interface RoomRow {
  key: number
  roomNumber: string
  adults: string
  children: string
  complementary: string[]
  roomStatus: string
  collapsed: boolean
}
function newRoomRow(defaultStatus: string): RoomRow {
  roomRowSeq += 1
  return { key: roomRowSeq, roomNumber: '', adults: '', children: '', complementary: [], roomStatus: defaultStatus, collapsed: false }
}

const STEPS = [
  { key: 'details', label: 'Reservation Details', sub: 'Booking information' },
  { key: 'rooms', label: 'Room Information', sub: 'Add rooms and guests' },
  { key: 'billing', label: 'Billing Details', sub: 'Payment information' },
  { key: 'review', label: 'Review & Confirm', sub: 'Check and submit' },
] as const

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <Fragment key={s.key}>
          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`shrink-0 w-8 h-8 rounded-full grid place-items-center text-xs font-bold ${
                i < step ? 'bg-brand text-white' : i === step ? 'bg-brand text-white ring-4 ring-brand/20' : 'bg-surface-alt text-text-faint border border-border'
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <div className="hidden md:block">
              <p className={`text-sm font-semibold ${i <= step ? 'text-text!' : 'text-text-faint'}`}>{s.label}</p>
              <p className="text-xs text-text-faint">{s.sub}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 md:mx-4 ${i < step ? 'bg-brand' : 'bg-border'}`} />}
        </Fragment>
      ))}
    </div>
  )
}

// Real page: booking/reservation/booking.php?type=booking — the classic
// "Add Booking" form behind the sidebar's real "Booking/Check-In List" leaf
// (its own "+ Add" button goes here — confirmed live: the real llx_menu row
// for that leaf points at booking/reservation/booking_list.php, a classic
// page, not the Hotel Suite SPA; see hotel.queries.ts's own top comment on
// the classic-booking hooks for the full finding). Rebuilt against the real
// *rendered* page, not just its raw HTML source: Ref No, Purpose and the 4
// "Extra Service" checkboxes (Driver/Gym & Spa/Breakfast/Dinner) all exist
// as real markup in the page's source but are wrapped in an HTML comment
// there (confirmed live) — genuinely never shown to a real user — so
// they're deliberately left out here too, same reasoning as Billing Details
// only ever showing Payable Amount (the tax/service_charge/total/
// booking_charge fields the page's own JS references have no id= anywhere
// in the real Billing Details section). Room Number stays real but
// necessarily empty right now: reservation_ajax.php?action=
// get_rooms_for_select (live-tested) returns zero rooms for any date range
// on this backend, the same zero-room-inventory root cause already
// documented in HotelAddRoomPage.tsx (a=saveroom is confirmed broken, so no
// room has ever actually been created). Saves via reservation_ajax.php?
// action=add_booking — live-tested end-to-end (created real booking
// BK-000001, confirmed it in the real Booking/Check-In List, then cleaned
// up via the real Cancel Booking action). Room card chrome (numbered badge,
// Active pill, Copy/Collapse/Delete) is local-only UI state, not a real
// backend field — Copy duplicates a room row's client-side values into a
// new row, and Collapse just hides that row's fields, neither one talks to
// the backend.
//
// Presented as a 4-step wizard (Reservation Details → Room Information →
// Billing Details → Review & Confirm) per explicit request — purely a
// presentation layer over the exact same state/hooks/validation/mutation
// the single-page version used. Billing Details still shows only the one
// real Payable Amount field (see the note above on why the other billing
// fields a generic wizard reference might show don't exist on this real
// page) — nothing fabricated.
export function HotelNewBooking() {
  const { data: options } = useHotelBookingFormOptions()
  const [step, setStep] = useState(0)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [bookingType, setBookingType] = useState('')
  const [bookingSource, setBookingSource] = useState('')
  const [checkinType, setCheckinType] = useState('')
  const [arrivalFrom, setArrivalFrom] = useState('')
  const [remarks, setRemarks] = useState('')
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [roomPage, setRoomPage] = useState(1)
  const [roomsPerPage, setRoomsPerPage] = useState(3)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: customerResults } = useHotelCustomerSearch(customerQuery)
  const { data: roomOptions, isFetching: loadingRooms } = useHotelRoomsForSelect(checkIn, checkOut)
  const createBooking = useHotelCreateClassicBooking()

  const seededRef = useRef(false)
  useEffect(() => {
    if (!seededRef.current && options) {
      seededRef.current = true
      setRooms([newRoomRow(options.roomStatuses[0]?.value ?? '')])
    }
  }, [options])

  const roomTotalPages = Math.max(1, Math.ceil(rooms.length / roomsPerPage))
  const roomPageClamped = Math.min(roomPage, roomTotalPages)
  const visibleRooms = rooms.slice((roomPageClamped - 1) * roomsPerPage, roomPageClamped * roomsPerPage)

  function addRoomRow() {
    setRooms((prev) => {
      const next = [...prev, newRoomRow(options?.roomStatuses[0]?.value ?? '')]
      setRoomPage(Math.max(1, Math.ceil(next.length / roomsPerPage)))
      return next
    })
  }
  function removeRoomRow(key: number) {
    setRooms((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }
  function updateRoomRow(key: number, patch: Partial<RoomRow>) {
    setRooms((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function copyRoomRow(key: number) {
    setRooms((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      if (idx === -1) return prev
      roomRowSeq += 1
      const copy: RoomRow = { ...prev[idx], key: roomRowSeq, collapsed: false }
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
      setRoomPage(Math.ceil((idx + 2) / roomsPerPage))
      return next
    })
  }
  function toggleCollapse(key: number) {
    setRooms((prev) => prev.map((r) => (r.key === key ? { ...r, collapsed: !r.collapsed } : r)))
  }

  function goNext() {
    setError('')
    if (step === 0) {
      if (!customerId) return setError('Customer Name is required.')
      if (!checkIn || !checkOut) return setError('Check-In and Check-Out are required.')
      if (!bookingType) return setError('Booking Type is required.')
      if (!bookingSource) return setError('Booking Source is required.')
    }
    if (step === 1) {
      for (const r of rooms) {
        if (!r.roomNumber) return setError('Please select room numbers.')
        if (!r.roomStatus) return setError('Please select room status.')
        if (!r.adults) return setError('Please enter number of adults.')
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  function goBack() {
    setError('')
    setStep((s) => Math.max(0, s - 1))
  }

  function handleSave() {
    setError('')
    setSuccess('')
    if (!customerId) return setError('Customer Name is required.')
    if (!checkIn || !checkOut) return setError('Check-In and Check-Out are required.')
    if (!bookingType) return setError('Booking Type is required.')
    if (!bookingSource) return setError('Booking Source is required.')
    for (const r of rooms) {
      if (!r.roomNumber) return setError('Please select room numbers.')
      if (!r.roomStatus) return setError('Please select room status.')
      if (!r.adults) return setError('Please enter number of adults.')
    }

    const payload: CreateClassicBookingInput = {
      socid: customerId,
      checkIn,
      checkOut,
      arrivalFrom,
      refNo: '',
      purpose: '',
      bookingType,
      bookingSource,
      checkinType,
      remarks,
      rooms: rooms.map((r) => ({ roomNumber: r.roomNumber, adults: r.adults, children: r.children || '0', complementary: r.complementary, roomStatus: r.roomStatus })),
    }

    createBooking.mutate(payload, {
      onSuccess: (res) => {
        setSuccess(`Reservation ${res.booking_id ?? ''} created.`)
        setCustomerId('')
        setCustomerQuery('')
        setCheckIn('')
        setCheckOut('')
        setBookingType('')
        setBookingSource('')
        setCheckinType('')
        setArrivalFrom('')
        setRemarks('')
        setRooms([newRoomRow(options?.roomStatuses[0]?.value ?? '')])
        setStep(0)
      },
      onError: (e) => setError(e instanceof Error ? e.message : 'Failed to create reservation.'),
    })
  }

  return (
    <StickyFormShell
      headerClassName="pt-3 pb-2.5"
      header={
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <CalendarCheck size={20} className="text-brand" /> New Booking
          </h2>
          <Stepper step={step} />
        </div>
      }
      scrollsInternally={false}
      footerLeft={
        step === 0 ? (
          <Link to={ROUTES.hotelReservations} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
        ) : (
          <button type="button" onClick={goBack} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <ArrowLeft size={14} /> Back
          </button>
        )
      }
      footerRight={
        step < STEPS.length - 1 ? (
          <button type="button" onClick={goNext} className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            Next <ArrowRight size={14} />
          </button>
        ) : null
      }
    >
      {error && <p className="text-xs text-danger">{error}</p>}
      {success && (
        <p className="text-xs text-success-fg flex items-center gap-1">
          <Check size={12} /> {success}
        </p>
      )}

      {step === 0 && (
        <Card className="!h-auto space-y-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
              <CalendarCheck size={18} />
            </span>
            <div>
              <h3 className="font-semibold text-text!">Reservation Details</h3>
              <p className="text-xs text-text-faint mt-0.5">Enter the basic booking information to get started</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={reqCls}>Booking Date *</span>
              <input value={todayDisplay()} readOnly className={`${inputCls} opacity-70 cursor-not-allowed`} />
            </label>
            <label className="flex flex-col gap-1 relative">
              <span className={reqCls}>Customer Name *</span>
              <span className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                <input
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value)
                    setCustomerId('')
                  }}
                  placeholder="Search customer…"
                  className={`${inputCls} pr-9`}
                />
              </span>
              {customerQuery.trim().length >= 2 && !customerId && customerResults && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {customerResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(r.id)
                        setCustomerQuery(r.name)
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
              <span className={reqCls}>Check-In *</span>
              <input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={reqCls}>Check-Out *</span>
              <input type="datetime-local" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={reqCls}>Booking Type *</span>
              <select value={bookingType} onChange={(e) => setBookingType(e.target.value)} className={inputCls}>
                <option value="">Select Booking Type</option>
                {(options?.bookingTypes ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.text}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={reqCls}>Booking Source *</span>
              <select value={bookingSource} onChange={(e) => setBookingSource(e.target.value)} className={inputCls}>
                <option value="">Select Booking Source</option>
                {(options?.bookingSources ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.text}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Check-In Type</span>
              <select value={checkinType} onChange={(e) => setCheckinType(e.target.value)} className={inputCls}>
                <option value="">Select check-in type</option>
                {(options?.checkinTypes ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.text}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Arrival From</span>
              <input value={arrivalFrom} onChange={(e) => setArrivalFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelCls}>Remarks</span>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={3}
                placeholder="Enter remarks (optional)…"
                className={`${inputCls} h-auto py-2`}
              />
              <span className="self-end text-xs text-text-faint">{remarks.length}/500</span>
            </label>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="!h-auto space-y-4 w-full">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
                <BedDouble size={18} />
              </span>
              <div>
                <h3 className="font-semibold text-text!">Room Information</h3>
                <p className="text-xs text-text-faint mt-0.5">
                  {!checkIn || !checkOut
                    ? 'Pick Check-In and Check-Out above to load available rooms.'
                    : checkIn && checkOut && !loadingRooms && roomOptions && roomOptions.length === 0
                      ? 'No rooms available for these dates.'
                      : 'Add rooms and set guest information for each room.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1.5 rounded-md bg-surface border border-border text-xs font-medium text-text-muted whitespace-nowrap">
                {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'}
              </span>
              <button type="button" onClick={addRoomRow} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                <Plus size={15} /> Add Room
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {visibleRooms.map((r, localI) => {
              const i = (roomPageClamped - 1) * roomsPerPage + localI
              return (
              <div key={r.key} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold grid place-items-center">{i + 1}</span>
                    <span className="text-sm font-bold text-text! uppercase tracking-wide truncate">Room {i + 1}</span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-success-bg text-success-fg text-xs font-medium">Active</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyRoomRow(r.key)}
                      title="Copy this room's settings into a new room"
                      className="flex items-center gap-1 h-8 px-2.5 rounded-md border border-border text-xs font-medium text-text-muted hover:bg-surface-hover"
                    >
                      <Copy size={12} /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(r.key)}
                      title={r.collapsed ? 'Expand' : 'Collapse'}
                      className="w-8 h-8 rounded-md border border-border grid place-items-center text-text-muted hover:bg-surface-hover"
                    >
                      <ChevronDown size={14} className={`transition-transform ${r.collapsed ? '' : 'rotate-180'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRoomRow(r.key)}
                      disabled={rooms.length <= 1}
                      title="Delete this room"
                      className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-danger text-white text-xs font-medium hover:bg-danger/90 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {!r.collapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                    <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <span className={reqCls}>Room Number *</span>
                      <span className="relative">
                        <BedDouble size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                        <select
                          value={r.roomNumber}
                          onChange={(e) => updateRoomRow(r.key, { roomNumber: e.target.value })}
                          className={`${inputCls} pl-9`}
                          disabled={!checkIn || !checkOut || !roomOptions || roomOptions.length === 0}
                        >
                          <option value="">Select Room</option>
                          {(roomOptions ?? []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.text}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={reqCls}>Adults *</span>
                      <span className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={r.adults}
                          onChange={(e) => updateRoomRow(r.key, { adults: e.target.value })}
                          className={`${inputCls} pl-9`}
                        />
                      </span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelCls}>Children</span>
                      <span className="relative">
                        <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={r.children}
                          onChange={(e) => updateRoomRow(r.key, { children: e.target.value })}
                          className={`${inputCls} pl-9`}
                        />
                      </span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelCls}>Complementary</span>
                      <span className="relative">
                        <Gift size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                        <select
                          value={r.complementary[0] ?? ''}
                          onChange={(e) => updateRoomRow(r.key, { complementary: e.target.value ? [e.target.value] : [] })}
                          className={`${inputCls} pl-9`}
                        >
                          <option value="">None</option>
                          {(options?.complementary ?? []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.text}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelCls}>Room Status</span>
                      <span className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                        <select value={r.roomStatus} onChange={(e) => updateRoomRow(r.key, { roomStatus: e.target.value })} className={`${inputCls} pl-9`}>
                          {(options?.roomStatuses ?? []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.text}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                  </div>
                )}
              </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addRoomRow}
            className="w-full flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-border py-4 text-brand hover:bg-brand/5"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Plus size={15} /> Add Another Room
            </span>
            <span className="text-xs text-text-faint">You can add as many rooms as needed.</span>
          </button>

          {rooms.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border text-xs text-text-muted">
              <span>
                Showing {(roomPageClamped - 1) * roomsPerPage + 1}–{Math.min(roomPageClamped * roomsPerPage, rooms.length)} of {rooms.length} rooms
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={roomPageClamped <= 1}
                  onClick={() => setRoomPage(Math.max(1, roomPageClamped - 1))}
                  className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={14} />
                </button>
                {getPageNumbers(roomPageClamped, roomTotalPages).map((p, idx) =>
                  p === '…' ? (
                    <span key={`e-${idx}`} className="px-1.5 text-text-faint select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRoomPage(p)}
                      className={`min-w-[1.75rem] px-2 py-1 rounded-md ${p === roomPageClamped ? 'bg-brand text-white font-semibold' : 'text-text hover:bg-surface-hover'}`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={roomPageClamped >= roomTotalPages}
                  onClick={() => setRoomPage(Math.min(roomTotalPages, roomPageClamped + 1))}
                  className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <label className="flex items-center gap-1.5">
                Show
                <select
                  value={roomsPerPage}
                  onChange={(e) => {
                    setRoomsPerPage(Number(e.target.value))
                    setRoomPage(1)
                  }}
                  className="rounded-md border border-input-border bg-input-bg text-text px-1.5 py-1"
                >
                  {[3, 5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                rooms per page
              </label>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-info-bg/40 p-3">
            <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
            <p className="text-xs text-info-fg">
              You can add multiple rooms for this reservation. Set the number of adults, children and any complementary services for each room.
            </p>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="!h-auto space-y-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
              <Coins size={18} />
            </span>
            <div>
              <h3 className="font-semibold text-text!">Billing Details</h3>
              <p className="text-xs text-text-faint mt-0.5">Payment information</p>
            </div>
          </div>
          <label className="flex flex-col gap-1 max-w-xs">
            <span className={labelCls}>Payable Amount</span>
            <span className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint text-sm pointer-events-none">K</span>
              <input
                value="0.00"
                readOnly
                title="This backend currently has zero rooms in inventory (a=saveroom is confirmed broken — see Add Room's own note), so no room rate can ever be priced here yet."
                className={`${inputCls} pl-8 opacity-70 cursor-not-allowed`}
              />
            </span>
          </label>
        </Card>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
          <Card className="!h-auto space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
                  <UserCheck size={18} />
                </span>
                <div>
                  <h3 className="font-semibold text-text!">Review Booking Details</h3>
                  <p className="text-xs text-text-faint mt-0.5">Please review all details before submitting</p>
                </div>
              </div>
              <button type="button" onClick={() => setStep(0)} className="shrink-0 text-xs font-medium text-brand hover:underline">
                Edit
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Reservation details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Booking date</span>
                  <span className="sm:block font-medium text-text!">{todayDisplay()}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Customer name</span>
                  <span className="sm:block font-medium text-text!">{customerQuery || '—'}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Check-in</span>
                  <span className="sm:block font-medium text-text!">{checkIn || '—'}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Check-out</span>
                  <span className="sm:block font-medium text-text!">{checkOut || '—'}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Booking type</span>
                  <span className="sm:block font-medium text-text!">{labelFor(options?.bookingTypes, bookingType)}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Booking source</span>
                  <span className="sm:block font-medium text-text!">{labelFor(options?.bookingSources, bookingSource)}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Check-in type</span>
                  <span className="sm:block font-medium text-text!">{checkinType ? labelFor(options?.checkinTypes, checkinType) : 'N/A'}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-faint">Arrival from</span>
                  <span className="sm:block font-medium text-text!">{arrivalFrom || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">
                Room information ({rooms.length} {rooms.length === 1 ? 'room' : 'rooms'})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide">
                      <th className="py-1.5 pr-3">#</th>
                      <th className="py-1.5 pr-3">Room number</th>
                      <th className="py-1.5 pr-3">Adults</th>
                      <th className="py-1.5 pr-3">Children</th>
                      <th className="py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r, i) => (
                      <tr key={r.key} className="border-t border-border">
                        <td className="py-1.5 pr-3 text-text-faint">{i + 1}</td>
                        <td className="py-1.5 pr-3 font-medium text-text!">{labelFor(roomOptions, r.roomNumber)}</td>
                        <td className="py-1.5 pr-3">{r.adults || '0'}</td>
                        <td className="py-1.5 pr-3">{r.children || '0'}</td>
                        <td className="py-1.5">{labelFor(options?.roomStatuses, r.roomStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {remarks && (
              <div>
                <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-1">Remarks</p>
                <p className="text-sm text-text-muted">{remarks}</p>
              </div>
            )}
          </Card>

          <Card className="!h-auto space-y-3">
            <h3 className="font-semibold text-text!">Billing Summary</h3>
            <div className="flex items-center justify-between text-base pt-1">
              <span className="text-text-muted">Payable amount</span>
              <span className="font-bold text-text!">K0.00</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-info-bg/40 p-3">
              <p className="text-xs text-info-fg">Click the button below to create the reservation. You can go back and edit details if needed.</p>
            </div>
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-success px-5 py-2.5 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
            >
              {createBooking.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save Booking
            </button>
          </Card>
        </div>
      )}
    </StickyFormShell>
  )
}
