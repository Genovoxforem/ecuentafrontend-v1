import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'

export interface BookingRow {
  bookingRef: string
  customer: string
  checkIn: string
  checkOut: string
  status: string
}

export interface HotelSummary {
  totalRooms: number
  availableRooms: number
  bookedRooms: number
  checkedInRooms: number
  totalBookings: number
  todaysBookings: number
  todaysCheckIns: number
  todaysCheckOuts: number
  pendingBookings: number
  recentBookings: BookingRow[]
}

export type RoomStatus = 'available' | 'booked' | 'checked-in'

export interface Room {
  id: string
  number: string
  type: string
  status: RoomStatus
}

interface Booking {
  bookingRef: string
  roomId: string
  customer: string
  checkIn: string
  checkOut: string
  status: 'Booked' | 'Checked-in' | 'Checked-out'
}

interface HotelState {
  rooms: Room[]
  bookings: Booking[]
}

// Fixed room inventory — no room-management endpoint exists to add/remove
// rooms from, so this stands in for what would otherwise come from a
// property setup step.
const SEED_ROOMS: Room[] = [
  { id: '1', number: '101', type: 'Standard', status: 'available' },
  { id: '2', number: '102', type: 'Standard', status: 'available' },
  { id: '3', number: '103', type: 'Standard', status: 'available' },
  { id: '4', number: '201', type: 'Deluxe', status: 'available' },
  { id: '5', number: '202', type: 'Deluxe', status: 'available' },
  { id: '6', number: '203', type: 'Deluxe', status: 'available' },
  { id: '7', number: '301', type: 'Suite', status: 'available' },
  { id: '8', number: '302', type: 'Suite', status: 'available' },
]

const SEED: HotelState = { rooms: SEED_ROOMS, bookings: [] }
const KEY = ['local', 'hotel'] as const

// No backend endpoint exists for the hotel/booking module on this app's
// server. Rooms + bookings are held in react-query's cache only — see
// shared/localCollection.ts — so booking/check-in/check-out here feels
// real in the browser but never persists anywhere.
export function useHotelSummary() {
  const [state] = useLocalCollection(KEY, SEED)
  const today = todayIso()
  const summary: HotelSummary = {
    totalRooms: state.rooms.length,
    availableRooms: state.rooms.filter((r) => r.status === 'available').length,
    bookedRooms: state.rooms.filter((r) => r.status === 'booked').length,
    checkedInRooms: state.rooms.filter((r) => r.status === 'checked-in').length,
    totalBookings: state.bookings.length,
    todaysBookings: state.bookings.filter((b) => b.checkIn === today).length,
    todaysCheckIns: state.bookings.filter((b) => b.status === 'Checked-in' && b.checkIn === today).length,
    todaysCheckOuts: state.bookings.filter((b) => b.status === 'Checked-out' && b.checkOut === today).length,
    pendingBookings: state.bookings.filter((b) => b.status === 'Booked').length,
    recentBookings: state.bookings.slice(0, 10).map(({ bookingRef, customer, checkIn, checkOut, status }) => ({ bookingRef, customer, checkIn, checkOut, status })),
  }
  return { data: summary, isError: false, isLoading: false }
}

export function useAvailableRooms(): Room[] {
  const [state] = useLocalCollection(KEY, SEED)
  return state.rooms.filter((r) => r.status === 'available')
}

export function useCreateBooking() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: { roomId: string; customer: string; checkIn: string; checkOut: string }) => {
    update((current) => {
      const room = current.rooms.find((r) => r.id === input.roomId)
      if (!room) return current
      const booking: Booking = {
        bookingRef: nextLocalRef('BK'),
        roomId: room.id,
        customer: input.customer,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        status: 'Booked',
      }
      return {
        rooms: current.rooms.map((r) => (r.id === room.id ? { ...r, status: 'booked' as const } : r)),
        bookings: [booking, ...current.bookings],
      }
    })
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `New booking for ${input.customer}`, category: 'other', authorName })
  }
}

export function useCheckIn() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (bookingRef: string) => {
    update((current) => {
      const booking = current.bookings.find((b) => b.bookingRef === bookingRef)
      if (!booking) return current
      return {
        rooms: current.rooms.map((r) => (r.id === booking.roomId ? { ...r, status: 'checked-in' as const } : r)),
        bookings: current.bookings.map((b) => (b.bookingRef === bookingRef ? { ...b, status: 'Checked-in' as const } : b)),
      }
    })
  }
}

export function useCheckOut() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (bookingRef: string) => {
    update((current) => {
      const booking = current.bookings.find((b) => b.bookingRef === bookingRef)
      if (!booking) return current
      return {
        rooms: current.rooms.map((r) => (r.id === booking.roomId ? { ...r, status: 'available' as const } : r)),
        bookings: current.bookings.map((b) => (b.bookingRef === bookingRef ? { ...b, status: 'Checked-out' as const } : b)),
      }
    })
  }
}
