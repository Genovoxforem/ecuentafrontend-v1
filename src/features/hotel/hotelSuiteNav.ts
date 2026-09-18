import {
  Gauge,
  ClipboardList,
  CalendarDays,
  CalendarPlus,
  BellRing,
  BedDouble,
  QrCode,
  Sparkles,
  Wrench,
  Hourglass,
  Boxes,
  Users,
  ConciergeBell,
  UtensilsCrossed,
  BarChart3,
  FileEdit,
  Receipt,
  Tag,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '../../routes'

export interface HotelSuiteNavItem {
  label: string
  path: string
  icon: LucideIcon
  // The real Suite's own per-view subtitle (its SUB{} JS object, already
  // used to fix each page's own header text) — reused here as the single
  // source of truth for HotelSuiteLayout's shared topbar, so the title
  // shown there always matches this list's own label.
  subtitle: string
  // Only set where the real page's own <h1> (its TIT{} value) differs from
  // this list's own (shorter, sidebar-appropriate) label — currently just
  // Calendar ("Booking Calendar" vs "Calendar"). HotelSuiteLayout's topbar
  // falls back to `label` when this is absent.
  title?: string
}
export interface HotelSuiteNavGroup {
  label: string
  items: HotelSuiteNavItem[]
}

// Mirrors the real Hotel Suite's own internal sidebar (custom/hotel/app.php
// — confirmed live, a genuinely separate nested nav from this app's own
// outer sidebar tree, grouped "OPERATIONS" / "ESTATE").
// "Concierge" → hotelSuiteConcierge (HotelSuiteConcierge.tsx, r=wakeups +
// r=enquiries — confirmed live: a condensed two-card "Wake-up Calls" /
// "Enquiries & Leads" dashboard, distinct from the fuller classic
// DataTables pages the outer sidebar's own "Wake-Up Calls" and "Enquiry"
// leaves use, which share the exact same real resources/mutations — this
// item used to reuse the classic Enquiry page as a stand-in before this
// dedicated page existed.
// "Reservations" → hotelSuiteReservations (HotelSuiteReservations.tsx,
// r=bookings — confirmed live against the real tab's own plain Booking/
// Guest/Type/Stay/Source/Status/Balance table, no filters/export/
// pagination there either). Distinct from HotelReservations.tsx (the
// classic Booking/Check-In List, booking_list.php) and HotelBookingReportPage.tsx
// (the classic Booking Report, booking_report.php) — this item used to
// reuse Booking Report as a stand-in before this dedicated page existed.
// "New Booking" → hotelSuiteNewBooking (HotelSuiteNewBooking.tsx,
// a=createbooking — confirmed live by reading the Suite's own nbInit()/
// nbCalc()/doCreate() JS directly: Guest search + "+ Add new guest" toggle,
// Arrival From/Purpose, plain-date Check-In/Check-Out, Rate plan/source
// from real bookingplans, tap-to-add suites, Summary with Tourism levy
// (1.5%)/Estimated total/Discount/Advance/Balance due). Distinct from
// HotelNewBooking.tsx (the classic booking.php form, reached from the
// outer sidebar's own "Booking/Check-In List" → "+ Add" button) — this
// item used to reuse that classic page as a stand-in before this dedicated
// page existed.
export const HOTEL_SUITE_NAV: HotelSuiteNavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: ROUTES.bookingDashboard, icon: Gauge, subtitle: 'Live operational overview' },
      { label: 'Reservations', path: ROUTES.hotelSuiteReservations, icon: ClipboardList, subtitle: 'All reservations' },
      { label: 'Calendar', path: ROUTES.hotelCalendar, icon: CalendarDays, subtitle: 'Room-by-day availability grid', title: 'Booking Calendar' },
      { label: 'New Booking', path: ROUTES.hotelSuiteNewBooking, icon: CalendarPlus, subtitle: 'Create a reservation' },
      { label: 'Front Desk', path: ROUTES.hotelFrontDesk, icon: BellRing, subtitle: 'Front desk operations' },
      { label: 'Rooms', path: ROUTES.hotelRooms, icon: BedDouble, subtitle: 'Live suite rack' },
      { label: 'Room QR', path: ROUTES.hotelRoomQr, icon: QrCode, subtitle: 'Scan to open in-room ordering' },
      { label: 'Housekeeping', path: ROUTES.hotelHousekeeping, icon: Sparkles, subtitle: 'Suite status' },
      { label: 'Maintenance', path: ROUTES.hotelMaintenance, icon: Wrench, subtitle: 'Tickets & work orders' },
      { label: 'Waitlist', path: ROUTES.hotelWaitlist, icon: Hourglass, subtitle: 'Guests awaiting availability' },
      { label: 'Inventory', path: ROUTES.hotelInventory, icon: Boxes, subtitle: 'Stock levels · Ecuenta Stock (read-only)' },
      { label: 'Guests', path: ROUTES.hotelGuests, icon: Users, subtitle: 'Guest CRM' },
      { label: 'Concierge', path: ROUTES.hotelSuiteConcierge, icon: ConciergeBell, subtitle: 'Wake-up calls & leads' },
      { label: 'Room Service', path: ROUTES.hotelRoomService, icon: UtensilsCrossed, subtitle: 'Guest orders & F&B' },
    ],
  },
  {
    label: 'Estate',
    items: [
      { label: 'Reports', path: ROUTES.hotelReports, icon: BarChart3, subtitle: 'Bed types & settings data' },
      { label: 'Quotations', path: ROUTES.hotelQuotes, icon: FileEdit, subtitle: 'Proposals & corporate offers' },
      { label: 'Invoices', path: ROUTES.hotelInvoices, icon: Receipt, subtitle: 'Billing & ZRA documents' },
      { label: 'Rates & Channels', path: ROUTES.hotelRatesChannels, icon: Tag, subtitle: 'Distribution & pricing' },
      { label: 'Settings', path: ROUTES.hotelSettings, icon: Settings, subtitle: 'Property configuration' },
    ],
  },
]

// Flat path → nav-item lookup for HotelSuiteLayout's shared topbar (title +
// subtitle), built once from the grouped list above instead of duplicating
// it as a second map that could drift out of sync.
export const HOTEL_SUITE_PAGE_BY_PATH: Record<string, HotelSuiteNavItem> = Object.fromEntries(
  HOTEL_SUITE_NAV.flatMap((group) => group.items).map((item) => [item.path, item]),
)
