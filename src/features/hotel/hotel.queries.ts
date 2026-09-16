import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hotelGet, hotelPost, useHotelToken } from './hotelApi'

// Real shapes confirmed live against custom/hotel/api.php?r=<resource> — see
// hotelApi.ts's own top comment. Every field below was observed in an
// actual response, not guessed.

export interface HotelRackRoom {
  id: string
  no: string
  type: string
  status: 'occupied' | 'ready' | 'dirty' | 'arriving' | 'ooo' | string
  floor: string
  floorname: string | null
}

export interface HotelDashboard {
  occupancy: number
  adr: number
  revpar: number
  total: number
  counts: { occupied: number; ready: number; dirty: number; ooo: number; arriving: number }
  arrivals: number
  departures: number
  inhouse: number
  revenue: number
  rack: HotelRackRoom[]
}

export interface HotelDashKpi {
  alos: number
  canrate: number
  reprate: number
  outstanding: number
  monthrev: number
  alerts: { cleaning: number; checkins: number; overdue: number; overdue_amt: number; maintenance: number }
}

export interface HotelTrendPoint {
  ym: string
  label: string
  bookings: number
  revenue: number
}

export interface HotelBookingRow {
  num: string
  guest: string
  btype: string
  ci: string
  co: string
  src: string
  status: string
  bal: number
}

export interface HotelArrival {
  num: string
  guest: string
  btype: string
  rooms: string
  eta: string
  bal: number
}

export interface HotelInhouseGuest {
  num: string
  guest: string
  rooms: string
  co: string
  due: 0 | 1
  bal: number
}

export interface HotelCheckoutRow {
  num: string
  guest: string
  rooms: string
  ci: string
  co: string
  cout: string
  inv: number
  invref: string
  total: number
}

export interface HotelAvailableRoom {
  id: string
  no: string
  type: string
  capacity: number
  bed_charge: number
  tlrate: number
  lv1: number
  lv2: number
  lv3: number
  lv4: number
  lv5: number
  rate_ttc: number
  rate: number
}

export interface HotelGuest {
  id: string
  name: string
  email: string
  phone: string
  stays: string
  val: string
  last: string | null
  code: string
  zraid: string
  zrastatus: string
  address: string
  zip: string
  town: string
  country: string
  tpin: string
  idno: string
}

export interface HotelRoomType {
  id: number
  name: string
}

export interface HotelStaffOption {
  id: string
  name: string
}

export interface HotelCleanJob {
  id: string
  room: string
  hk: string
  assigned: string
  status: 'assigned' | 'inprogress' | 'completed' | 'inspected' | string
}

export interface HotelBookingPlan {
  name: string
  level: number
}

export interface HotelMe {
  admin: number
  uid: number
  m: Record<string, number>
}

// ── Reads ──────────────────────────────────────────────────────────────
export function useHotelMe() {
  return useQuery({ queryKey: ['hotel', 'me'], queryFn: () => hotelGet<HotelMe>('me') })
}
export function useHotelDashboard() {
  return useQuery({ queryKey: ['hotel', 'dashboard'], queryFn: () => hotelGet<HotelDashboard>('dashboard') })
}
export function useHotelDashKpi() {
  return useQuery({ queryKey: ['hotel', 'dashkpi'], queryFn: () => hotelGet<HotelDashKpi>('dashkpi') })
}
export function useHotelTrends() {
  return useQuery({ queryKey: ['hotel', 'trends'], queryFn: () => hotelGet<HotelTrendPoint[]>('trends') })
}
export function useHotelRack() {
  return useQuery({ queryKey: ['hotel', 'rack'], queryFn: () => hotelGet<HotelRackRoom[]>('rack') })
}
export function useHotelBookings() {
  return useQuery({ queryKey: ['hotel', 'bookings'], queryFn: () => hotelGet<HotelBookingRow[]>('bookings') })
}
export function useHotelArrivals() {
  return useQuery({ queryKey: ['hotel', 'arrivals'], queryFn: () => hotelGet<HotelArrival[]>('arrivals') })
}
export function useHotelInhouse() {
  return useQuery({ queryKey: ['hotel', 'inhouse'], queryFn: () => hotelGet<HotelInhouseGuest[]>('inhouse') })
}
export function useHotelUpcoming() {
  return useQuery({ queryKey: ['hotel', 'upcoming'], queryFn: () => hotelGet<HotelArrival[]>('upcoming') })
}
export function useHotelCheckouts() {
  return useQuery({ queryKey: ['hotel', 'checkouts'], queryFn: () => hotelGet<HotelCheckoutRow[]>('checkouts') })
}
export function useHotelAvailable(checkIn: string, checkOut: string) {
  return useQuery({
    queryKey: ['hotel', 'available', checkIn, checkOut],
    queryFn: () => hotelGet<HotelAvailableRoom[]>(`available&ci=${encodeURIComponent(checkIn)}&co=${encodeURIComponent(checkOut)}`),
    enabled: !!checkIn && !!checkOut,
  })
}
export function useHotelGuests() {
  return useQuery({ queryKey: ['hotel', 'guests'], queryFn: () => hotelGet<HotelGuest[]>('guests') })
}
export function useHotelRoomTypes() {
  return useQuery({ queryKey: ['hotel', 'roomtypes'], queryFn: () => hotelGet<HotelRoomType[]>('roomtypes'), staleTime: 1000 * 60 * 10 })
}
export function useHotelHousekeepers() {
  return useQuery({ queryKey: ['hotel', 'housekeepers'], queryFn: () => hotelGet<HotelStaffOption[]>('housekeepers') })
}
export function useHotelMaintStaff() {
  return useQuery({ queryKey: ['hotel', 'maintstaff'], queryFn: () => hotelGet<HotelStaffOption[]>('maintstaff') })
}
export function useHotelCleanJobs() {
  return useQuery({ queryKey: ['hotel', 'cleanjobs'], queryFn: () => hotelGet<HotelCleanJob[]>('cleanjobs') })
}
export function useHotelBookingPlans() {
  return useQuery({ queryKey: ['hotel', 'bookingplans'], queryFn: () => hotelGet<HotelBookingPlan[]>('bookingplans'), staleTime: 1000 * 60 * 10 })
}
export function useHotelCustomerSearch(q: string) {
  return useQuery({
    queryKey: ['hotel', 'customers', q],
    queryFn: () => hotelGet<{ id: string; name: string; code: string; phone: string; stays: number }[]>(`customers&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  })
}

// ── Writes ─────────────────────────────────────────────────────────────
// Every mutation below needs the real per-session TOKEN (useHotelToken) —
// components call useHotelToken() once and pass token.data into these.
function invalidateOperations(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['hotel', 'dashboard'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'dashkpi'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'rack'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'bookings'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'arrivals'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'inhouse'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'upcoming'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'checkouts'] })
  qc.invalidateQueries({ queryKey: ['hotel', 'available'] })
}

export function useHotelCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, room, token }: { booking: string; room?: string; token: string }) => hotelPost('checkin', { booking, room }, token),
    onSuccess: () => invalidateOperations(qc),
  })
}
export function useHotelCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, force, token }: { booking: string; force?: boolean; token: string }) => hotelPost('checkout', { booking, force: force ? 1 : undefined }, token),
    onSuccess: () => invalidateOperations(qc),
  })
}
export function useHotelCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, token }: { booking: string; token: string }) => hotelPost('cancel', { booking }, token),
    onSuccess: () => invalidateOperations(qc),
  })
}
export function useHotelMoveRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, to, token }: { booking: string; to: string; token: string }) => hotelPost('move', { booking, to }, token),
    onSuccess: () => invalidateOperations(qc),
  })
}
export function useHotelEditDates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, ci, co, token }: { booking: string; ci: string; co: string; token: string }) => hotelPost('editdates', { booking, ci, co }, token),
    onSuccess: () => invalidateOperations(qc),
  })
}
export function useHotelCustSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('custsync', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'guests'] }),
  })
}
export function useHotelSaveGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, email, phone, token }: { id: string; name: string; email: string; phone: string; token: string }) =>
      hotelPost('saveguest', { id, name, email, phone }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'guests'] }),
  })
}
export interface CreateBookingInput {
  guest: string
  checkin: string
  checkout: string
  rooms: string
  source: string
  customer_id?: string
  rmeta?: string
  arrival_from?: string
  purpose?: string
  gemail?: string
  gphone?: string
  gaddr?: string
  gzip?: string
  gtown?: string
  gcountry?: string
  gtpin?: string
  gidno?: string
  disc?: number
  advance?: number
  rsvc?: string
  token: string
}
export function useHotelCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: CreateBookingInput) => hotelPost('createbooking', fields, token),
    onSuccess: () => invalidateOperations(qc),
  })
}
export function useHotelCleanRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ room, token }: { room: string; token: string }) => hotelPost('clean', { room }, token),
    onSuccess: () => {
      invalidateOperations(qc)
      qc.invalidateQueries({ queryKey: ['hotel', 'cleanjobs'] })
    },
  })
}
export function useHotelCleanAdvance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to, token }: { id: string; to: string; token: string }) => hotelPost('cleanadvance', { id, to }, token),
    onSuccess: () => {
      invalidateOperations(qc)
      qc.invalidateQueries({ queryKey: ['hotel', 'cleanjobs'] })
    },
  })
}
export function useHotelAssignClean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ hk, rooms, token }: { hk: string; rooms: string; token: string }) => hotelPost('assignclean', { hk, rooms }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'cleanjobs'] }),
  })
}

export { useHotelToken }
