import { useState, type ComponentType, type ReactNode } from 'react'
import {
  Globe2,
  Plus,
  BedDouble,
  Building2,
  DoorOpen,
  Bookmark,
  UserCheck,
  CalendarRange,
  CalendarCheck,
  CalendarClock,
  LogIn,
  LogOut,
  Clock,
  History,
  X,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useAvailableRooms, useCreateBooking, useCheckIn, useCheckOut, type HotelSummary } from '../hotel.queries'
import { todayIso } from '../../../shared/localCollection'

const ICON_COLORS = {
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  cyan: 'text-cyan-500',
  violet: 'text-violet-500',
  orange: 'text-orange-500',
} as const

function RoomStatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: ComponentType<{ size?: number; className?: string }>
  color: keyof typeof ICON_COLORS
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-3xl font-bold text-text!">{value}</span>
        <Icon size={26} className={ICON_COLORS[color]} />
      </div>
      <p className="text-sm text-text-muted">{label}</p>
    </Card>
  )
}

function NewBookingForm({ onClose }: { onClose: () => void }) {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const rooms = useAvailableRooms()
  const createBooking = useCreateBooking()
  const today = todayIso()

  const [customerId, setCustomerId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(today)
  const [error, setError] = useState('')

  function handleSubmit() {
    const customer = customers?.find((c) => c.id === customerId)
    if (!customer || !roomId) {
      setError('Customer and room are both required.')
      return
    }
    if (checkOut < checkIn) {
      setError('Check-out must be on or after check-in.')
      return
    }
    createBooking({ roomId, customer: customer.name, checkIn, checkOut })
    onClose()
  }

  return (
    <Card className="border-brand/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">New Booking</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Customer</span>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2">
            <option value="">{customersLoading ? 'Loading…' : 'Select a customer'}</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Room</span>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2">
            <option value="">{rooms.length === 0 ? 'No rooms available' : 'Select a room'}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · {r.type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Check-in</span>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Check-out</span>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Create booking
        </button>
      </div>
    </Card>
  )
}

function HeaderButton({ icon: Icon, label, onClick, tone }: { icon: ComponentType<{ size?: number }>; label: string; onClick: () => void; tone: 'blue' | 'plain' }) {
  const toneClasses = tone === 'blue' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-surface-alt border border-border text-text hover:bg-surface-hover'
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${toneClasses}`}>
      <Icon size={14} /> {label}
    </button>
  )
}

function BookingRowAction({ status, bookingRef }: { status: string; bookingRef: string }): ReactNode {
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  if (status === 'Booked') {
    return (
      <button type="button" onClick={() => checkIn(bookingRef)} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
        <LogIn size={12} /> Check in
      </button>
    )
  }
  if (status === 'Checked-in') {
    return (
      <button type="button" onClick={() => checkOut(bookingRef)} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
        <LogOut size={12} /> Check out
      </button>
    )
  }
  return <span className="text-text-faint">-</span>
}

export function HotelOverview({ summary }: { summary: HotelSummary }) {
  const [showNewBooking, setShowNewBooking] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Globe2 size={20} className="text-brand" /> Booking Dashboard
        </h2>
        <div className="flex flex-wrap gap-2">
          <HeaderButton icon={Plus} label="New Booking" tone="blue" onClick={() => setShowNewBooking((v) => !v)} />
        </div>
      </div>

      {showNewBooking && <NewBookingForm onClose={() => setShowNewBooking(false)} />}

      <h3 className="flex items-center gap-2 font-semibold text-text-muted">
        <BedDouble size={16} /> Room Status Overview
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <RoomStatCard label="Total Rooms" value={summary.totalRooms} icon={Building2} color="blue" />
        <RoomStatCard label="Available Rooms" value={summary.availableRooms} icon={DoorOpen} color="green" />
        <RoomStatCard label="Booked Rooms" value={summary.bookedRooms} icon={Bookmark} color="amber" />
        <RoomStatCard label="Checked-in Rooms" value={summary.checkedInRooms} icon={UserCheck} color="rose" />
      </div>

      <h3 className="flex items-center gap-2 font-semibold text-text-muted">
        <CalendarRange size={16} /> Booking Statistics
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <RoomStatCard label="Total Bookings" value={summary.totalBookings} icon={CalendarCheck} color="blue" />
        <RoomStatCard label="Today's Bookings" value={summary.todaysBookings} icon={CalendarClock} color="cyan" />
        <RoomStatCard label="Today's Check-ins" value={summary.todaysCheckIns} icon={LogIn} color="green" />
        <RoomStatCard label="Today's Check-outs" value={summary.todaysCheckOuts} icon={LogOut} color="violet" />
        <RoomStatCard label="Pending Bookings" value={summary.pendingBookings} icon={Clock} color="orange" />
      </div>

      <h3 className="flex items-center gap-2 font-semibold text-text!">
        <History size={16} className="text-brand" /> Recent Bookings
      </h3>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs font-semibold text-text uppercase tracking-wide border-b border-border bg-surface">
                <th className="px-4 py-3">Booking #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentBookings.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-text-faint italic" colSpan={6}>
                    No Bookings Found
                  </td>
                </tr>
              ) : (
                summary.recentBookings.map((b) => (
                  <tr key={b.bookingRef} className="border-t border-border">
                    <td className="px-4 py-3 text-brand">{b.bookingRef}</td>
                    <td className="px-4 py-3 text-text!">{b.customer}</td>
                    <td className="px-4 py-3 text-text-muted">{b.checkIn}</td>
                    <td className="px-4 py-3 text-text-muted">{b.checkOut}</td>
                    <td className="px-4 py-3 text-text-muted">{b.status}</td>
                    <td className="px-4 py-3">
                      <BookingRowAction status={b.status} bookingRef={b.bookingRef} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
