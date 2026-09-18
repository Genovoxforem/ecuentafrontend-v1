import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hotelGet, hotelPost, hotelPostFile, useHotelToken } from './hotelApi'
import { fetchLegacyDocument, parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { parseCreateRoomFormOptions, type CreateRoomOption } from './createRoomFormParser'
import { parseClassicBookingFormOptions, parseRoomOptionsFragment, type ClassicBookingOption } from './classicBookingFormParser'

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

export interface HotelUpcomingGuest {
  num: string
  guest: string
  btype: string
  rooms: string
  cidate: string
  din: number
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

export interface HotelMaintTicket {
  id: string
  issue: string
  category: string
  created: string
  room: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent' | string
  assignee: string | null
  status: 'reported' | 'assigned' | 'inprogress' | 'completed' | string
  room_id?: string
  assigned_to?: string
  notes?: string
}

export interface HotelWaitlistEntry {
  id: string
  name: string
  phone: string
  rtype: string
  pax: number
  status: 'waiting' | 'contacted' | 'converted' | 'cancelled' | string
  ci_raw: string | null
  ci: string
  co: string | null
  co_raw?: string | null
  customer_id?: string
  room_type_id?: string
  note?: string
}

export interface HotelWakeupCall {
  id: string
  room: string
  guest: string
  wdate: string
  wtime: string
  status: 'pending' | 'completed' | string
}

export interface HotelEnquiry {
  id: string
  name: string
  email: string
  phone: string
  ci: string | null
  co: string | null
  message: string | null
  created: string
}

export interface HotelOccRoom {
  id: string
  no: string
  guest: string | null
  status: 'checkin' | 'booked' | string
}

export interface HotelRsOrderItem {
  qty: number
  name: string
}
export interface HotelRsOrder {
  id: string
  room_number: string
  guest_name: string
  source: 'guest' | 'staff' | string
  created: string
  items: HotelRsOrderItem[]
  total: number
  notes: string | null
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'rejected' | string
}
export interface HotelRsRoom {
  num: string
  room: string
  guest: string | null
}
export interface HotelPosMenuItem {
  id: string
  name: string
  category: string
  price: number
  tva_tx: number
  active: 0 | 1
}

export interface HotelWarehouse {
  id: string
  ref: string
  lieu: string
  items: string
  units: string
}
export interface HotelStockMove {
  at: string
  ref: string
  label: string
  qty: number
  warehouse: string
  note: string
  by_name: string
}
export interface HotelInventoryItem {
  id: string
  ref: string
  label: string
  stock: number | null
  seuil: number | null
  price: number
}

export interface HotelReportsSummary {
  occupancy: number
  adr: number
  revpar: number
  revenue: number
  noshows: number
  sources: { src: string; v: number }[]
  trend: { d: string; occ: number }[]
}
export type LedgerType = 'history' | 'cancelled' | 'groups' | 'nationality' | 'activity' | 'police' | 'cleaning'
export interface HotelLedgerRow {
  num?: string
  guest?: string
  rooms?: string
  ci?: string
  co?: string
  status?: string
  total?: number
  country?: string
  guests?: number
  bookings?: number
  tsf?: string
  typ?: string
  ref?: string
  who?: string
  ccode?: string
  idno?: string
  arrival?: string
  purpose?: string
  room?: string
  hk?: string
  assigned?: string
  completed?: string
}

export interface HotelRatePlanColumn {
  name: string
  level: number
}
export interface HotelRatePlanRow {
  ty: number
  type: string
  pid: number
  p1?: number
  p2?: number
  p3?: number
  p4?: number
  p5?: number
}
export interface HotelRatePlans {
  plans: HotelRatePlanColumn[]
  rows: HotelRatePlanRow[]
}

export interface HotelChannel {
  id: string
  name: string
  type: string
  property_id: string
  enabled: 0 | 1
  has_key: 0 | 1
  sync_status: string | null
  last_sync: string | null
}

export interface HotelInvoiceRow {
  id: string
  ref: string
  guest: string | null
  bnum: string | null
  date: string
  total: number
  status: 0 | 1 | 2 | 3
  paye: 0 | 1
  paid: number
  zracode: string | null
}

export interface HotelQuoteRow {
  id: string
  quo: string
  ref: string
  guest: string
  created: string
  valid_fmt: string
  total: number
  state: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted' | string
}
export interface HotelQuoteCatalogItem {
  id: string
  label: string
  tlrate?: number
  price?: number
}
export interface HotelQuoteCatalog {
  rooms: HotelQuoteCatalogItem[]
  services: HotelQuoteCatalogItem[]
  tlrate: number
}
export interface HotelQuoteCfg {
  validity_days: number
  terms: string
}

export interface HotelRoomQrRoom {
  no: string
  type: string
}

export interface HotelCalendarCell {
  st: 'occupied' | 'reserved' | 'vacant' | 'ooo' | string
  bnum?: string
  guest?: string
}
export interface HotelCalendarRow {
  no: string
  type: string
  cells: HotelCalendarCell[]
}
export interface HotelCalendar {
  dates: string[]
  rows: HotelCalendarRow[]
}

export interface HotelSettingsTypeRow {
  id: string
  name: string
  status: 0 | 1 | 2
}
export interface HotelSettingsBundle {
  bed: HotelSettingsTypeRow[]
  booking: HotelSettingsTypeRow[]
  roomtype: HotelSettingsTypeRow[]
  commi: { id: string; name: string; rate: number }[]
  floor: HotelSettingsTypeRow[]
}
export interface HotelRoomAdmin {
  id: string
  no: string
  type: string
  ty: number
  floor: string
  rate: number | null
  rate_ttc: number | null
  status: 0 | 1 | 2
  zraid: string | null
  zracode: string | null
  zrastatus: string | null
  pid: number
}
export interface HotelFeatureRow {
  id: string
  name: string
  amount: number
  amount_ttc?: number
  status: 0 | 1
  src: 'feat' | 'prod'
  ftype?: string
  zraid?: string
  // Only ever present on 'prod'-sourced rows (confirmed by reading the
  // Suite's own nbRoomCfg()/nbCalc() JS directly, which reads f.tlrate to
  // add a per-service tourism-levy line — see HotelSuiteNewBooking.tsx).
  tlrate?: number
}
export interface HotelPayCfg {
  banks: { id: string; label: string }[]
  selected: number
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
  return useQuery({ queryKey: ['hotel', 'upcoming'], queryFn: () => hotelGet<HotelUpcomingGuest[]>('upcoming') })
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
export function useHotelMaintenance() {
  return useQuery({ queryKey: ['hotel', 'maintenance'], queryFn: () => hotelGet<HotelMaintTicket[]>('maintenance') })
}
export function useHotelWaitlist() {
  return useQuery({ queryKey: ['hotel', 'waitlist'], queryFn: () => hotelGet<HotelWaitlistEntry[]>('waitlist') })
}
export function useHotelWakeups() {
  return useQuery({ queryKey: ['hotel', 'wakeups'], queryFn: () => hotelGet<HotelWakeupCall[]>('wakeups') })
}
export function useHotelEnquiries() {
  return useQuery({ queryKey: ['hotel', 'enquiries'], queryFn: () => hotelGet<HotelEnquiry[]>('enquiries') })
}
export function useHotelOccRooms() {
  return useQuery({ queryKey: ['hotel', 'occrooms'], queryFn: () => hotelGet<HotelOccRoom[]>('occrooms') })
}
export function useHotelRsOrders(refetchInterval?: number) {
  return useQuery({ queryKey: ['hotel', 'rsorders'], queryFn: () => hotelGet<HotelRsOrder[]>('rsorders'), refetchInterval })
}
export function useHotelRsRooms() {
  return useQuery({ queryKey: ['hotel', 'rsrooms'], queryFn: () => hotelGet<HotelRsRoom[]>('rsrooms') })
}
export function useHotelPosMenu() {
  return useQuery({ queryKey: ['hotel', 'posmenu'], queryFn: () => hotelGet<HotelPosMenuItem[]>('posmenu'), staleTime: 1000 * 60 * 5 })
}
export function useHotelWarehouses() {
  return useQuery({ queryKey: ['hotel', 'warehouses'], queryFn: () => hotelGet<HotelWarehouse[]>('warehouses') })
}
export function useHotelStockMoves() {
  return useQuery({ queryKey: ['hotel', 'stockmoves'], queryFn: () => hotelGet<HotelStockMove[]>('stockmoves') })
}
export function useHotelInventory(q: string, low: string) {
  return useQuery({
    queryKey: ['hotel', 'inventory', q, low],
    queryFn: () => hotelGet<HotelInventoryItem[]>(`inventory&q=${encodeURIComponent(q)}&low=${encodeURIComponent(low)}`),
  })
}
export function useHotelReportsSummary() {
  return useQuery({ queryKey: ['hotel', 'reports'], queryFn: () => hotelGet<HotelReportsSummary>('reports') })
}
export function useHotelLedger(type: LedgerType) {
  return useQuery({ queryKey: ['hotel', 'report', type], queryFn: () => hotelGet<HotelLedgerRow[]>(`report&type=${type}`) })
}
export function useHotelRatePlans() {
  return useQuery({ queryKey: ['hotel', 'rateplans'], queryFn: () => hotelGet<HotelRatePlans>('rateplans') })
}
export function useHotelChannels() {
  return useQuery({ queryKey: ['hotel', 'channels'], queryFn: () => hotelGet<HotelChannel[]>('channels') })
}
export function useHotelInvoices() {
  return useQuery({ queryKey: ['hotel', 'invoices'], queryFn: () => hotelGet<HotelInvoiceRow[]>('invoices') })
}
export function useHotelCreditNotes() {
  return useQuery({ queryKey: ['hotel', 'creditnotes'], queryFn: () => hotelGet<HotelInvoiceRow[]>('creditnotes') })
}
export function useHotelQuotes() {
  return useQuery({ queryKey: ['hotel', 'quotes'], queryFn: () => hotelGet<HotelQuoteRow[]>('quotes') })
}
export function useHotelQuoteCatalog() {
  return useQuery({ queryKey: ['hotel', 'quotecatalog'], queryFn: () => hotelGet<HotelQuoteCatalog>('quotecatalog'), staleTime: 1000 * 60 * 5 })
}
export function useHotelRoomQr() {
  return useQuery({ queryKey: ['hotel', 'roomqr'], queryFn: () => hotelGet<HotelRoomQrRoom[]>('roomqr') })
}
export function useHotelCalendar(start: string, days: number) {
  return useQuery({
    queryKey: ['hotel', 'calendar', start, days],
    queryFn: () => hotelGet<HotelCalendar>(`calendar&start=${encodeURIComponent(start)}&days=${days}`),
    enabled: !!start,
  })
}
export function useHotelSettingsBundle() {
  return useQuery({ queryKey: ['hotel', 'settings'], queryFn: () => hotelGet<HotelSettingsBundle>('settings') })
}
export function useHotelRoomsAdmin() {
  return useQuery({ queryKey: ['hotel', 'rooms_admin'], queryFn: () => hotelGet<HotelRoomAdmin[]>('rooms_admin') })
}
export function useHotelFeatures() {
  return useQuery({ queryKey: ['hotel', 'features'], queryFn: () => hotelGet<HotelFeatureRow[]>('features') })
}
export function useHotelPayCfg() {
  return useQuery({ queryKey: ['hotel', 'paycfg'], queryFn: () => hotelGet<HotelPayCfg>('paycfg') })
}
export function useHotelVatRates() {
  return useQuery({ queryKey: ['hotel', 'vatrates'], queryFn: () => hotelGet<{ taux: string; code: string; note: string }[]>('vatrates'), staleTime: 1000 * 60 * 10 })
}
export function useHotelUnits() {
  return useQuery({ queryKey: ['hotel', 'units'], queryFn: () => hotelGet<{ id: string; label: string; code: string; ut: string }[]>('units'), staleTime: 1000 * 60 * 10 })
}
export function useHotelTlCodes() {
  return useQuery({ queryKey: ['hotel', 'tlcodes'], queryFn: () => hotelGet<{ rate: string; code: string; label: string }[]>('tlcodes'), staleTime: 1000 * 60 * 10 })
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

export interface SaveMaintInput {
  id?: string
  room: string
  issue: string
  category: string
  priority: string
  assigned_to: string
  notes: string
  token: string
}
export function useHotelSaveMaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveMaintInput) => hotelPost('savemaint', { ...fields, id: fields.id ?? '0' }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'maintenance'] }),
  })
}
export function useHotelMaintAdvance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to, token }: { id: string; to: string; token: string }) => hotelPost('maintadvance', { id, to }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'maintenance'] }),
  })
}
export function useHotelDelMaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delmaint', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'maintenance'] }),
  })
}

export interface SaveWaitInput {
  id?: string
  customer_id?: string
  name: string
  phone: string
  room_type: string
  pax: number
  check_in: string
  check_out: string
  note: string
  token: string
}
export function useHotelSaveWait() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveWaitInput) => hotelPost('savewait', { ...fields, id: fields.id ?? '0' }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'waitlist'] }),
  })
}
export function useHotelWaitStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to, token }: { id: string; to: string; token: string }) => hotelPost('waitstatus', { id, to }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'waitlist'] }),
  })
}

export function useHotelSaveWakeup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ room, guest, wdate, wtime, token }: { room: string; guest: string; wdate: string; wtime: string; token: string }) =>
      hotelPost('savewakeup', { room, guest, wdate, wtime }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'wakeups'] }),
  })
}
export function useHotelWakeupDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('wakedone', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'wakeups'] }),
  })
}
export function useHotelDelWakeup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delwakeup', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'wakeups'] }),
  })
}

export interface SaveEnquiryInput {
  name: string
  email: string
  phone: string
  ci: string
  co: string
  message: string
  token: string
}
export function useHotelSaveEnquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveEnquiryInput) => hotelPost('saveenquiry', fields, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'enquiries'] }),
  })
}
export function useHotelDelEnquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delenquiry', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'enquiries'] }),
  })
}

export function useHotelPostOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, roomno, lines, token }: { booking: string; roomno: string; lines: string; token: string }) =>
      hotelPost('postorder', { booking, roomno, lines }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'rsorders'] }),
  })
}
export function useHotelOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, token }: { id: string; status: string; token: string }) => hotelPost('orderstatus', { id, status }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'rsorders'] }),
  })
}
export function useHotelConfirmOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('confirmorder', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'rsorders'] }),
  })
}
export function useHotelRejectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('rejectorder', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'rsorders'] }),
  })
}

export function useHotelNightAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token }: { token: string }) => hotelPost('nightaudit', {}, token),
    onSuccess: () => {
      invalidateOperations(qc)
      qc.invalidateQueries({ queryKey: ['hotel', 'reports'] })
    },
  })
}

export function useHotelSaveRate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pid, level, price, token }: { pid: number; level: number; price: number; token: string }) => hotelPost('saverate', { pid, level, price }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'rateplans'] }),
  })
}
export interface SaveChannelInput {
  id?: string
  name: string
  type: string
  property_id: string
  api_key: string
  api_secret: string
  enabled: 0 | 1
  token: string
}
export function useHotelSaveChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveChannelInput) => hotelPost('savechannel', { ...fields, id: fields.id ?? '0' }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'channels'] }),
  })
}
export function useHotelDelChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delchannel', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'channels'] }),
  })
}

export function useHotelInvZraSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('invzrasync', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'invoices'] }),
  })
}

export interface SaveQuoteInput {
  id?: string
  socid: string
  ci: string
  co: string
  validity: string
  notes: string
  lines: string
  disc?: number
  discreason?: string
  token: string
}
export function useHotelSaveQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveQuoteInput) => hotelPost('savequote', { ...fields, id: fields.id ?? '0' }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'quotes'] }),
  })
}
export function useHotelQuoteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to, token }: { id: string; to: string; token: string }) => hotelPost('quotestatus', { id, to }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'quotes'] }),
  })
}
export function useHotelSendQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('sendquote', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'quotes'] }),
  })
}
export function useHotelConvertQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('convertquote', { id }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel', 'quotes'] })
      invalidateOperations(qc)
    },
  })
}
export function useHotelDelQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delquote', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'quotes'] }),
  })
}

export type HotelTypeKind = 'bed' | 'booking' | 'roomtype' | 'floor'
export function useHotelSaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, id, name, status, token }: { kind: HotelTypeKind; id?: string; name: string; status: 0 | 1 | 2; token: string }) =>
      hotelPost('savetype', { kind, id: id ?? '0', name, status }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'settings'] }),
  })
}
export function useHotelDelType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, id, token }: { kind: HotelTypeKind; id: string; token: string }) => hotelPost('deltype', { kind, id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'settings'] }),
  })
}

export interface SaveRoomInput {
  id?: string
  no: string
  ty: string
  floor: string
  rate: number
  status: 0 | 1 | 2
  cls: string
  country: string
  unit: string
  packing: string
  pbt: 'HT' | 'TTC'
  tva: number
  vatcode: string
  tl: string
  token: string
}
export function useHotelSaveRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveRoomInput) => hotelPost('saveroom', { ...fields, id: fields.id ?? '0', cap: 2 }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel', 'rooms_admin'] })
      qc.invalidateQueries({ queryKey: ['hotel', 'rack'] })
    },
  })
}
export function useHotelDelRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delroom', { id }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel', 'rooms_admin'] })
      qc.invalidateQueries({ queryKey: ['hotel', 'rack'] })
    },
  })
}
export function useHotelZraSyncRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pid, token }: { pid: number; token: string }) => hotelPost('zrasync', { pid }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'rooms_admin'] }),
  })
}

export interface SaveServiceInput {
  id?: string
  name: string
  rate: number
  pbt: 'HT' | 'TTC'
  status: 0 | 1
  cls: string
  country: string
  unit: string
  packing: string
  tva: number
  vatcode: string
  tl: string
  token: string
}
// The Hotel Suite's own a=savefeature (custom/hotel/api.php) only ever
// sends name + a hardcoded amount=0 (confirmed by reading app.php's own
// saveFeature() function) — real, but a narrower write than the classic
// booking/settings/feature.php page's own "Add Feature" offcanvas offers
// (Feature Type / Amount / Status, 3 fields that page's real screenshot
// shows and a=savefeature has no param for). That richer real write lives
// at booking/settings/booking_master.ajax.php (action=save_features,
// array-style feature_type[]/feature_name[]/accountancy_code[]/amount[]/
// status[] fields — read directly from that page's own saveAllBtn click
// handler) — confirmed live it writes the exact same r=features data
// a=savefeature does (a test row created this way showed up there
// immediately), so this is a strict superset, not a different resource.
// accountancy_code is sent empty (matching the simple single-row default
// flow that page itself uses before any accounting-code select is
// attached) since neither the real screenshot's default view nor this
// form exposes it.
export interface SaveFeatureFullInput {
  featureType: 'complementary' | 'facility' | 'amenities'
  name: string
  amount: number
  status: 1 | 2
}
export function useHotelSaveFeatureFull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveFeatureFullInput): Promise<{ status: string; message?: string }> => {
      const body = new URLSearchParams()
      body.append('action', 'save_features')
      body.append('feature_type[]', input.featureType)
      body.append('feature_name[]', input.name)
      body.append('accountancy_code[]', '')
      body.append('amount[]', String(input.amount))
      body.append('status[]', String(input.status))
      body.append('edit_id', '')
      const res = await fetch('/booking/settings/booking_master.ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = (await res.json()) as { status: string; message?: string }
      if (data.status !== 'success') throw new Error(data.message || 'Failed to save feature.')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'features'] }),
  })
}
export function useHotelSaveService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveServiceInput) => hotelPost('saveservice', fields, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'features'] }),
  })
}
export function useHotelDelFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delfeature', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'features'] }),
  })
}
export function useHotelDelService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('delservice', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'features'] }),
  })
}
export function useHotelSavePayAcct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ account, token }: { account: string; token: string }) => hotelPost('savepayacct', { account }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'paycfg'] }),
  })
}

// ---------------------------------------------------------------------------
// Real APIs the Suite's own app.php calls that this app hadn't wired yet —
// every shape/field below was read directly out of that file's own JS (its
// checkoutModal/collectPayModal/roomChargeModal/editRoomsRender/guestDetail/
// guestDocsList/quote-editor/settings functions), not guessed. Grouped to
// match the real checkout/billing wizard those functions form together.

// r=folio&booking=X — itemized guest billing (same real endpoint the
// existing folio preview on Front Desk's in-house card already reads via
// inhSelect's own inline fetch; this adds a reusable hook for the fuller
// checkout wizard below).
export interface HotelFolioLine {
  grp?: 'suite' | 'service' | 'kitchen' | string
  desc?: string
  item?: string
  amt: number
  qty?: number
  date?: string
  dkey?: string
}
export interface HotelFolio {
  lines: HotelFolioLine[]
  discount: number
  service: number
  tourism: number
  vat: number
  total: number
  advance: number
  balance: number
  usd: number
  error?: string
}
export function useHotelFolio(booking: string) {
  return useQuery({
    queryKey: ['hotel', 'folio', booking],
    queryFn: () => hotelGet<HotelFolio>(`folio&booking=${encodeURIComponent(booking)}`),
    enabled: !!booking,
  })
}

// r=foliopay&booking=X — the checkout-readiness state (invoice generated?
// finalized/ZRA? collected payments applied?) the real checkoutModal()
// gates its "Check out" button on.
export interface HotelFolioPay {
  invoice_id?: string | number
  inv_validated?: string | number
  inv_ref?: string
  unapplied?: string | number
  collected?: string | number
  early?: string | number
  booked_nights?: string | number
  booked_co?: string
  actual_nights?: string | number
  error?: string
}
export function useHotelFolioPay(booking: string) {
  return useQuery({
    queryKey: ['hotel', 'foliopay', booking],
    queryFn: () => hotelGet<HotelFolioPay>(`foliopay&booking=${encodeURIComponent(booking)}`),
    enabled: !!booking,
  })
}

// a=invoice — generates the booking's invoice (step 1 of the real checkout
// wizard). Real response includes `existing` when one was already on file.
export function useHotelGenerateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, token }: { booking: string; token: string }) => hotelPost('invoice', { booking }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'foliopay', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'invoices'] })
    },
  })
}
// a=validateinvoice — finalizes + fiscalizes (ZRA) the invoice (step 2,
// irreversible on the real backend, same as its own confirm() prompt says).
export function useHotelFinalizeInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, token }: { booking: string; token: string }) => hotelPost('validateinvoice', { booking, confirm: 1 }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'foliopay', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'invoices'] })
    },
  })
}
// a=recordpayment — records a payment against the booking (step 3).
export function useHotelRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, amount, mode, ref, token }: { booking: string; amount: number; mode: string; ref: string; token: string }) =>
      hotelPost('recordpayment', { booking, amount, mode, ref }, token),
    onSuccess: (_r, { booking }) => qc.invalidateQueries({ queryKey: ['hotel', 'foliopay', booking] }),
  })
}
// a=applycollected — applies already-collected payments onto the finalized
// invoice (step 4, the last gate before checkout is allowed).
export function useHotelApplyCollected() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, token }: { booking: string; token: string }) => hotelPost('applycollected', { booking }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'foliopay', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'invoices'] })
    },
  })
}

// r=roomcharges&booking=X + a=addcharge/voidcharge — the real "Charge to
// room" widget (POS/kitchen/laundry charges billed to a guest's folio).
export interface HotelRoomCharge {
  id: string
  category?: string
  label: string
  qty: number
  by_name?: string
  at?: string
  amt: number
}
export function useHotelRoomCharges(booking: string) {
  return useQuery({
    queryKey: ['hotel', 'roomcharges', booking],
    queryFn: () => hotelGet<HotelRoomCharge[]>(`roomcharges&booking=${encodeURIComponent(booking)}`),
    enabled: !!booking,
  })
}
export function useHotelAddCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      booking,
      product,
      label,
      unitPrice,
      category,
      qty,
      token,
    }: {
      booking: string
      product?: string
      label?: string
      unitPrice?: number
      category: string
      qty: number
      token: string
    }) => hotelPost('addcharge', { booking, product: product || 0, label: label || '', unit_price: unitPrice || 0, category, qty }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'roomcharges', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'folio', booking] })
    },
  })
}
export function useHotelVoidCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; booking: string; token: string }) => hotelPost('voidcharge', { id }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'roomcharges', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'folio', booking] })
    },
  })
}

// r=poscatalog&q=X — the real product search "Charge to room" uses (a
// separate, TakePOS-flavored catalog from r=posmenu already wired for Room
// Service).
export interface HotelPosCatalogItem {
  id: string
  label: string
  ref?: string
  price: number
}
export function useHotelPosCatalog(q: string) {
  return useQuery({
    queryKey: ['hotel', 'poscatalog', q],
    queryFn: () => hotelGet<HotelPosCatalogItem[]>(`poscatalog&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  })
}

// r=bookingrooms&booking=X + a=addroom/removeroom — the real "Edit rooms"
// panel (a booking can hold more than one suite; brid is the per-suite
// booking-room row id removeroom needs, distinct from the room's own id).
export interface HotelBookingRoom {
  brid: string
  no: string
  rate: number
}
export function useHotelBookingRooms(booking: string) {
  return useQuery({
    queryKey: ['hotel', 'bookingrooms', booking],
    queryFn: () => hotelGet<HotelBookingRoom[]>(`bookingrooms&booking=${encodeURIComponent(booking)}`),
    enabled: !!booking,
  })
}
export function useHotelAddBookingRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, room, token }: { booking: string; room: string; token: string }) => hotelPost('addroom', { booking, room }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'bookingrooms', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'available'] })
      qc.invalidateQueries({ queryKey: ['hotel', 'inhouse'] })
    },
  })
}
export function useHotelRemoveBookingRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ booking, brid, token }: { booking: string; brid: string; token: string }) => hotelPost('removeroom', { booking, brid }, token),
    onSuccess: (_r, { booking }) => {
      qc.invalidateQueries({ queryKey: ['hotel', 'bookingrooms', booking] })
      qc.invalidateQueries({ queryKey: ['hotel', 'available'] })
      qc.invalidateQueries({ queryKey: ['hotel', 'inhouse'] })
    },
  })
}

// r=guesthistory&id=X — a single guest's own real stay history (distinct
// from r=guests' flat directory row).
export interface HotelGuestHistoryBooking {
  num: string
  ci: string
  co: string
  status: string
  amt: number
}
export interface HotelGuestHistory {
  // Confirmed live: narrower than r=guests' own HotelGuest row (fk_pays
  // instead of country, no stays/val/last/code/zraid/zip) — its own shape.
  guest: { id: string; name: string; email: string; phone: string; town: string; prefs: string; tpin: string; idno: string; fk_pays: string }
  profile?: { nationality?: string; id_type?: string; id_number?: string; dob?: string; vip?: 0 | 1; tax_exempt?: 0 | 1; prefs?: string } | null
  bookings: HotelGuestHistoryBooking[]
  country?: string
  stays?: number
  spent?: number
}
export function useHotelGuestHistory(id: string) {
  return useQuery({
    queryKey: ['hotel', 'guesthistory', id],
    queryFn: () => hotelGet<HotelGuestHistory>(`guesthistory&id=${encodeURIComponent(id)}`),
    enabled: !!id,
  })
}
// a=saveguestid — the guest profile's ID/nationality/VIP fields (separate
// from a=saveguest's own name/email/phone, confirmed by reading both).
export function useHotelSaveGuestProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      nationality,
      idType,
      idNumber,
      dob,
      vip,
      taxExempt,
      token,
    }: {
      id: string
      nationality: string
      idType: string
      idNumber: string
      dob: string
      vip: boolean
      taxExempt: boolean
      token: string
    }) => hotelPost('saveguestid', { id, nationality, id_type: idType, id_number: idNumber, dob, vip: vip ? 1 : 0, tax_exempt: taxExempt ? 1 : 0 }, token),
    onSuccess: (_r, { id }) => qc.invalidateQueries({ queryKey: ['hotel', 'guesthistory', id] }),
  })
}
// a=savepref — the guest's free-text preferences note.
export function useHotelSaveGuestPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, prefs, token }: { id: string; prefs: string; token: string }) => hotelPost('savepref', { id, prefs }, token),
    onSuccess: (_r, { id }) => qc.invalidateQueries({ queryKey: ['hotel', 'guesthistory', id] }),
  })
}
// a=savecustomer — the full third-party contact-details form (name/email/
// phone/address/zip/town/country/tpin/idno), a richer edit than
// a=saveguest's 3 fields.
export function useHotelSaveCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      name,
      email,
      phone,
      address,
      zip,
      town,
      country,
      tpin,
      idno,
      token,
    }: {
      id: string
      name: string
      email: string
      phone: string
      address: string
      zip: string
      town: string
      country: string
      tpin: string
      idno: string
      token: string
    }) => hotelPost('savecustomer', { id, name, email, phone, address, zip, town, country, tpin, idno }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'guests'] }),
  })
}

// r=docs&socid=X + a=uploaddoc/deldoc — a guest's real uploaded documents
// (ID/passport scans etc.), stored against their third-party (socid).
export interface HotelGuestDoc {
  name: string
  url: string
  date?: string
}
export function useHotelGuestDocs(socid: string) {
  return useQuery({
    queryKey: ['hotel', 'docs', socid],
    queryFn: () => hotelGet<HotelGuestDoc[]>(`docs&socid=${encodeURIComponent(socid)}`),
    enabled: !!socid,
  })
}
export function useHotelUploadDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ socid, file, token }: { socid: string; file: File; token: string }) => hotelPostFile('uploaddoc', { socid }, file, 'file', token),
    onSuccess: (_r, { socid }) => qc.invalidateQueries({ queryKey: ['hotel', 'docs', socid] }),
  })
}
export function useHotelDelDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ socid, file, token }: { socid: string; file: string; token: string }) => hotelPost('deldoc', { socid, file }, token),
    onSuccess: (_r, { socid }) => qc.invalidateQueries({ queryKey: ['hotel', 'docs', socid] }),
  })
}

// r=quote&id=X — a single quotation's own detail + line items (the list
// resource r=quotes, already wired, only carries summary rows).
export interface HotelQuoteDetailLine {
  id?: string
  parent?: string | number | null
  label?: string | null
  descr?: string
  qty?: string
  unit?: string
  tva_tx?: string
  total?: string
  pid?: string
  ptype?: string
}
export interface HotelQuoteDetail {
  // Confirmed live: richer than the list row (HotelQuoteRow) — real ref/
  // state/ht/ttc/email/phone alongside the fields already modeled there.
  quote: {
    id?: string
    ref?: string
    quo?: string
    st?: string
    socid?: string
    guest?: string
    email?: string
    phone?: string
    ci?: string
    co?: string
    valid_raw?: string
    notes?: string
    ht?: string
    ttc?: string
    expired?: 0 | 1
    state?: string
  }
  lines: HotelQuoteDetailLine[]
  error?: string
}
export function useHotelQuoteDetail(id: string) {
  return useQuery({
    queryKey: ['hotel', 'quote', id],
    queryFn: () => hotelGet<HotelQuoteDetail>(`quote&id=${encodeURIComponent(id)}`),
    enabled: !!id,
  })
}
// r=quotecfg — quotation defaults (validity window, boilerplate terms).
export function useHotelQuoteCfg() {
  return useQuery({ queryKey: ['hotel', 'quotecfg'], queryFn: () => hotelGet<HotelQuoteCfg>('quotecfg') })
}
export function useHotelSaveQuoteCfg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ validityDays, terms, token }: { validityDays: number; terms: string; token: string }) =>
      hotelPost('savequotecfg', { validity_days: validityDays, terms }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'quotecfg'] }),
  })
}

// r=bedtypes — a plain read-only bed-type list (settings.bed, already
// wired, is the editable superset this reads the same underlying rows as;
// kept as its own hook since it's the exact resource the real Reports
// tab's own "Bed types" sub-view calls).
export function useHotelBedTypesList() {
  return useQuery({ queryKey: ['hotel', 'bedtypes'], queryFn: () => hotelGet<HotelSettingsTypeRow[]>('bedtypes'), staleTime: 1000 * 60 * 10 })
}

// r=clssearch&q=X — Dolibarr product-classification code autocomplete (the
// real Add Room/Add Suite forms' "Classification" field), and r=fxrate —
// the real USD-equivalent conversion toggle those same money figures use.
export interface HotelClsOption {
  code: string
  label: string
}
export function useHotelClsSearch(q: string) {
  return useQuery({
    queryKey: ['hotel', 'clssearch', q],
    queryFn: () => hotelGet<HotelClsOption[]>(`clssearch&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  })
}
export interface HotelFxRate {
  enabled: boolean
  rate: number
  code?: string
}
export function useHotelFxRate() {
  return useQuery({ queryKey: ['hotel', 'fxrate'], queryFn: () => hotelGet<HotelFxRate>('fxrate'), staleTime: 1000 * 60 * 30 })
}

// r=invoicepdf&booking=X / r=receipt&rcpt=X — on-demand document links, so
// these are plain fetch-on-click helpers (React Query needs a stable key to
// cache against; a one-shot "open this PDF" action doesn't fit that, same
// reasoning as why the real page calls them inline rather than through its
// own api() cache).
export async function fetchHotelInvoicePdfUrl(booking: string): Promise<string> {
  const r = await hotelGet<{ ok?: boolean; url?: string; error?: string }>(`invoicepdf&booking=${encodeURIComponent(booking)}`)
  if (!r.url) throw new Error(r.error || 'No invoice available.')
  return r.url
}
export interface HotelReceiptItem {
  desc: string
  amt: number
}
export interface HotelReceipt {
  items: HotelReceiptItem[]
  [key: string]: unknown
}
export async function fetchHotelReceipt(rcpt: string): Promise<HotelReceipt> {
  return hotelGet<HotelReceipt>(`receipt&rcpt=${encodeURIComponent(rcpt)}`)
}

// a=syncchannel — pushes a channel-manager connection's rates/availability
// sync (Rates & Channels' own save/delete were already wired; this was the
// one action missing from that same CRUD).
export function useHotelSyncChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => hotelPost('syncchannel', { id }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel', 'channels'] }),
  })
}

// a=savesuite — builds a real room-type PRODUCT (label/SKU/price/tax/
// classification), distinct from a=savetype(kind=roomtype)'s own simple
// name-only list row. Live-tested directly against this backend: it fails
// outright with {"error":"Could not create suite: Table
// 'bazaudye.llx_room_types' doesn't exist"} — a genuine missing-table bug,
// not a working alternative to savetype's own non-persistence (see
// HotelRoomTypesPage.tsx's own comment for both findings side by side).
export interface SaveSuiteInput {
  label: string
  ref: string
  price: number
  pbt: 'HT' | 'TTC'
  tva: number
  cls: string
  unit: string
  packing: string
  token: string
}
export function useHotelSaveSuite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, ...fields }: SaveSuiteInput) => hotelPost('savesuite', fields, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel', 'roomtypes'] })
      qc.invalidateQueries({ queryKey: ['hotel', 'settings'] })
    },
  })
}

// Real, live Floor/Room Type options for Add Room's own dropdowns — see
// createRoomFormParser.ts's own comment for why this scrapes
// create_room.php directly instead of calling a JSON resource (there isn't
// one for this real category data).
export type { CreateRoomOption }
export function useHotelCreateRoomFormOptions() {
  return useQuery({
    queryKey: ['hotel', 'create-room-form-options'],
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/booking/settings/create_room.php', new URLSearchParams({ action: 'create', type: '1' }))
      return parseCreateRoomFormOptions(doc)
    },
    staleTime: 1000 * 30,
  })
}

// ── Classic "Add Booking" flow (booking/reservation/booking.php?type=
// booking + reservation_ajax.php) — the REAL flow behind the sidebar's
// "Booking/Check-In List" leaf, confirmed live via curl to be a totally
// separate backend page from the Hotel Suite SPA's own "New Booking" modal
// (a=createbooking, what useHotelCreateBooking above wires). The real
// llx_menu row for "Booking/Check-In List" points at
// booking/reservation/booking_list.php (classic), NOT custom/hotel/
// hotelindex.php (Suite) — unlike its sibling "Room Status", which does
// redirect into the Suite. That classic list page's own "+ Add" button
// goes to booking.php?type=booking, saved via reservation_ajax.php?
// action=add_booking — live-tested end-to-end on the dev backend
// (created real booking BK-000001, confirmed it in booking_table_ajax.php's
// own list, then cleaned up via action=create_cancel, the real page's own
// Cancel Booking action).
export type { ClassicBookingOption }
export function useHotelBookingFormOptions() {
  return useQuery({
    queryKey: ['hotel', 'classic-booking-form-options'],
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/booking/reservation/booking.php', new URLSearchParams({ type: 'booking' }))
      return parseClassicBookingFormOptions(doc)
    },
    staleTime: 1000 * 30,
  })
}

// reservation_ajax.php?action=get_rooms_for_select — real per-date room
// availability for the classic form's Room Number selects (live-tested:
// {"status":"success","options":""} on this backend's current zero-room
// inventory, same root cause already documented in HotelAddRoomPage.tsx —
// a=saveroom is confirmed broken, so no room has ever been created).
export function useHotelRoomsForSelect(checkIn: string, checkOut: string) {
  return useQuery({
    queryKey: ['hotel', 'classic-rooms-for-select', checkIn, checkOut],
    queryFn: async () => {
      const body = new URLSearchParams({ action: 'get_rooms_for_select', check_in: checkIn, check_out: checkOut, room: '', booking_id: '0' })
      const res = await fetch('/booking/reservation/reservation_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ status: string; options?: string; message?: string }>(res)
      if (data.status !== 'success') throw new Error(data.message || 'Could not load rooms for these dates.')
      return parseRoomOptionsFragment(data.options ?? '')
    },
    enabled: !!checkIn && !!checkOut,
    staleTime: 1000 * 10,
  })
}

interface RawClassicBookingRow {
  booking_number: string
  booking_date: string | number
  booking_date1: string
  room_number: string
  customer_name: string
  check_in: string
  check_out: string
  due_amount: string
  total_amount: string
  payment_status: string
  status: string
  action: string
}
export interface HotelClassicBookingRow {
  id: string
  num: string
  // The real page's own "Booking Date" column is genuinely bound to this
  // raw field, not to booking_date1's actual formatted date (confirmed by
  // reading the DataTable init JS directly: no columnDefs/render override
  // exists) — so on the live backend it visibly just shows a row counter.
  // Kept faithful to that real (if odd) display rather than silently
  // swapping in booking_date1, same principle as Check Out List's own
  // honest "—" for a field the real page doesn't actually show.
  bookingDateRaw: string
  room: string
  customer: string
  checkIn: string
  checkOut: string
  total: number
  due: number
  paymentStatus: string
  status: string
  canCancel: boolean
  canDelete: boolean
  summaryUrl: string | null
}
function anchorClassHas(actionHtml: string, marker: string, token: string): boolean {
  const m = actionHtml.match(new RegExp(`class='([^']*${marker}[^']*)'`))
  return m ? m[1].includes(token) : false
}
function extractHref(actionHtml: string, marker: string): string | null {
  const m = actionHtml.match(new RegExp(`class='${marker}[^']*'[\\s\\S]*?href='([^']*)'`))
  return m ? m[1].replace(/\\\//g, '/') : null
}
function parseClassicBookingRow(r: RawClassicBookingRow): HotelClassicBookingRow {
  const numMatch = r.booking_number.match(/>([^<]*)</)
  const idMatch = r.booking_number.match(/[?&]id=(\d+)/)
  return {
    id: idMatch ? idMatch[1] : '',
    num: numMatch ? numMatch[1].trim() : r.booking_number,
    bookingDateRaw: String(r.booking_date),
    room: r.room_number || '',
    customer: r.customer_name || '',
    checkIn: r.check_in,
    checkOut: r.check_out,
    total: Number(r.total_amount) || 0,
    due: Number(r.due_amount) || 0,
    paymentStatus: r.payment_status,
    status: r.status,
    canCancel: !anchorClassHas(r.action, 'cancel-btn', 'disabled'),
    canDelete: !anchorClassHas(r.action, 'delete-button', 'disabled'),
    summaryUrl: extractHref(r.action, 'summary-button'),
  }
}
// booking/reservation/booking_table_ajax.php — the classic list page's own
// real DataTables server-side source (live-tested with the full standard
// DataTables param set; a partial param set makes the real PHP emit
// "Undefined array key" warnings ahead of the JSON, confirmed live).
export function useHotelClassicBookings() {
  return useQuery({
    queryKey: ['hotel', 'classic-bookings'],
    queryFn: async () => {
      const cols = ['booking_date', 'booking_number', 'booking_date1', 'room_number', 'customer_name', 'check_in', 'check_out', 'total_amount', 'due_amount', 'payment_status', 'status', 'action']
      const params = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '2000',
        'search[value]': '',
        'search[regex]': 'false',
        'order[0][column]': '0',
        'order[0][dir]': 'desc',
        booking_type: '',
      })
      cols.forEach((c, i) => {
        params.set(`columns[${i}][data]`, c)
        params.set(`columns[${i}][name]`, '')
        params.set(`columns[${i}][searchable]`, i === 11 ? 'false' : 'true')
        params.set(`columns[${i}][orderable]`, i === 11 ? 'false' : 'true')
        params.set(`columns[${i}][search][value]`, '')
        params.set(`columns[${i}][search][regex]`, 'false')
      })
      const res = await fetch('/booking/reservation/booking_table_ajax.php', { method: 'POST', credentials: 'same-origin', body: params })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ recordsTotal: number; recordsFiltered: number; data: RawClassicBookingRow[] }>(res)
      return data.data.map(parseClassicBookingRow)
    },
    staleTime: 1000 * 15,
  })
}

export interface ClassicBookingRoomInput {
  roomNumber: string
  adults: string
  children: string
  complementary: string[]
  roomStatus: string
}
export interface CreateClassicBookingInput {
  socid: string
  checkIn: string
  checkOut: string
  arrivalFrom: string
  refNo: string
  purpose: string
  bookingType: string
  bookingSource: string
  checkinType: string
  remarks: string
  rooms: ClassicBookingRoomInput[]
}
// reservation_ajax.php?action=add_booking — live-tested (see this section's
// own top comment) and genuinely persists.
export function useHotelCreateClassicBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateClassicBookingInput) => {
      const body = new URLSearchParams()
      body.set('action', 'add_booking')
      body.set('booking_list_id', '')
      body.set('socid', input.socid)
      body.set('booking_date', new Date().toISOString().slice(0, 10))
      body.set('check_in', input.checkIn)
      body.set('check_out', input.checkOut)
      body.set('arrival_from', input.arrivalFrom)
      body.set('ref_no', input.refNo)
      body.set('purpose', input.purpose)
      body.set('booking_type', input.bookingType)
      body.set('booking_source', input.bookingSource)
      body.set('checkin_type', input.checkinType)
      body.set('remarks', input.remarks)
      input.rooms.forEach((r, i) => {
        body.append('room_number[]', r.roomNumber)
        body.append('adults[]', r.adults)
        body.append('children[]', r.children)
        body.append('room_status[]', r.roomStatus)
        body.append('bed_amount[]', '0')
        body.append('rent_amount[]', '0')
        if (r.complementary.length === 0) body.append(`complementary[${i}][]`, '')
        else r.complementary.forEach((c) => body.append(`complementary[${i}][]`, c))
      })
      const res = await fetch('/booking/reservation/reservation_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ status: string; message?: string; booking_id?: number }>(res)
      if (data.status !== 'success') throw new Error(data.message || 'Could not create the booking.')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel', 'classic-bookings'] })
      invalidateOperations(qc)
    },
  })
}
// reservation_ajax.php?action=create_cancel — the real page's own Cancel
// Booking offcanvas action (live-tested: genuinely marks the booking
// cancelled rather than deleting the row).
export function useHotelCancelClassicBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const body = new URLSearchParams({ action: 'create_cancel', booking_id: bookingId, cancel_reason: reason, cancel_amnt: '' })
      const res = await fetch('/booking/reservation/reservation_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<{ status: string; message?: string }>(res)
      if (data.status !== 'success') throw new Error(data.message || 'Could not cancel the booking.')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel', 'classic-bookings'] })
    },
  })
}

export { useHotelToken }
