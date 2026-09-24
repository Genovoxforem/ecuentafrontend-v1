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
  // Real per-view subtitle (app.php's SUB{}) — single source of truth for HotelSuiteLayout's topbar.
  subtitle: string
  // Only set where the real <h1> (TIT{}) differs from this label (currently just Calendar).
  title?: string
  // Real per-view RBAC key (app.php nav elements' data-v attribute; matches r=me's m{} keys).
  navKey: string
}
export interface HotelSuiteNavGroup {
  label: string
  items: HotelSuiteNavItem[]
}

// Mirrors the real Hotel Suite's internal sidebar (custom/hotel/app.php), a
// separate nested nav from this app's own outer sidebar tree. Concierge,
// Reservations and New Booking each have their own dedicated Suite page,
// distinct from the classic-menu pages that share the same real resources.
export const HOTEL_SUITE_NAV: HotelSuiteNavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: ROUTES.bookingDashboard, icon: Gauge, subtitle: 'Live operational overview', navKey: 'dash' },
      { label: 'Reservations', path: ROUTES.hotelSuiteReservations, icon: ClipboardList, subtitle: 'All reservations', navKey: 'resv' },
      { label: 'Calendar', path: ROUTES.hotelCalendar, icon: CalendarDays, subtitle: 'Room-by-day availability grid', title: 'Booking Calendar', navKey: 'cal' },
      { label: 'New Booking', path: ROUTES.hotelSuiteNewBooking, icon: CalendarPlus, subtitle: 'Create a reservation', navKey: 'newbook' },
      { label: 'Front Desk', path: ROUTES.hotelFrontDesk, icon: BellRing, subtitle: 'Front desk operations', navKey: 'fd' },
      { label: 'Rooms', path: ROUTES.hotelRooms, icon: BedDouble, subtitle: 'Live suite rack', navKey: 'rooms' },
      { label: 'Room QR', path: ROUTES.hotelRoomQr, icon: QrCode, subtitle: 'Scan to open in-room ordering', navKey: 'roomqr' },
      { label: 'Housekeeping', path: ROUTES.hotelHousekeeping, icon: Sparkles, subtitle: 'Suite status', navKey: 'hk' },
      { label: 'Maintenance', path: ROUTES.hotelMaintenance, icon: Wrench, subtitle: 'Tickets & work orders', navKey: 'maint' },
      { label: 'Waitlist', path: ROUTES.hotelWaitlist, icon: Hourglass, subtitle: 'Guests awaiting availability', navKey: 'wait' },
      { label: 'Inventory', path: ROUTES.hotelInventory, icon: Boxes, subtitle: 'Stock levels · Ecuenta Stock (read-only)', navKey: 'inv' },
      { label: 'Guests', path: ROUTES.hotelGuests, icon: Users, subtitle: 'Guest CRM', navKey: 'guests' },
      { label: 'Concierge', path: ROUTES.hotelSuiteConcierge, icon: ConciergeBell, subtitle: 'Wake-up calls & leads', navKey: 'concierge' },
      { label: 'Room Service', path: ROUTES.hotelRoomService, icon: UtensilsCrossed, subtitle: 'Guest orders & F&B', navKey: 'rs' },
    ],
  },
  {
    label: 'Estate',
    items: [
      { label: 'Reports', path: ROUTES.hotelReports, icon: BarChart3, subtitle: 'Bed types & settings data', navKey: 'reports' },
      { label: 'Quotations', path: ROUTES.hotelQuotes, icon: FileEdit, subtitle: 'Proposals & corporate offers', navKey: 'quotes' },
      { label: 'Invoices', path: ROUTES.hotelInvoices, icon: Receipt, subtitle: 'Billing & ZRA documents', navKey: 'invoices' },
      { label: 'Rates & Channels', path: ROUTES.hotelRatesChannels, icon: Tag, subtitle: 'Distribution & pricing', navKey: 'rates' },
      { label: 'Settings', path: ROUTES.hotelSettings, icon: Settings, subtitle: 'Property configuration', navKey: 'settings' },
    ],
  },
]

// Flat path → nav-item lookup for HotelSuiteLayout's topbar.
export const HOTEL_SUITE_PAGE_BY_PATH: Record<string, HotelSuiteNavItem> = Object.fromEntries(
  HOTEL_SUITE_NAV.flatMap((group) => group.items).map((item) => [item.path, item]),
)
