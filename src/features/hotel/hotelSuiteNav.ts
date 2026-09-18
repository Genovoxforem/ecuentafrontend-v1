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
      { label: 'Dashboard', path: ROUTES.bookingDashboard, icon: Gauge },
      { label: 'Reservations', path: ROUTES.hotelSuiteReservations, icon: ClipboardList },
      { label: 'Calendar', path: ROUTES.hotelCalendar, icon: CalendarDays },
      { label: 'New Booking', path: ROUTES.hotelSuiteNewBooking, icon: CalendarPlus },
      { label: 'Front Desk', path: ROUTES.hotelFrontDesk, icon: BellRing },
      { label: 'Rooms', path: ROUTES.hotelRooms, icon: BedDouble },
      { label: 'Room QR', path: ROUTES.hotelRoomQr, icon: QrCode },
      { label: 'Housekeeping', path: ROUTES.hotelHousekeeping, icon: Sparkles },
      { label: 'Maintenance', path: ROUTES.hotelMaintenance, icon: Wrench },
      { label: 'Waitlist', path: ROUTES.hotelWaitlist, icon: Hourglass },
      { label: 'Inventory', path: ROUTES.hotelInventory, icon: Boxes },
      { label: 'Guests', path: ROUTES.hotelGuests, icon: Users },
      { label: 'Concierge', path: ROUTES.hotelSuiteConcierge, icon: ConciergeBell },
      { label: 'Room Service', path: ROUTES.hotelRoomService, icon: UtensilsCrossed },
    ],
  },
  {
    label: 'Estate',
    items: [
      { label: 'Reports', path: ROUTES.hotelReports, icon: BarChart3 },
      { label: 'Quotations', path: ROUTES.hotelQuotes, icon: FileEdit },
      { label: 'Invoices', path: ROUTES.hotelInvoices, icon: Receipt },
      { label: 'Rates & Channels', path: ROUTES.hotelRatesChannels, icon: Tag },
      { label: 'Settings', path: ROUTES.hotelSettings, icon: Settings },
    ],
  },
]
