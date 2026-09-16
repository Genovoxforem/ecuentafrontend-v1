import { BedDouble } from 'lucide-react'
import type { NavSection } from '../navTypes'
import { ROUTES } from '../../routes'

// Mirrors the real app's "Hotel" left menu (llx_menu, mainmenu=hotel) — a
// single flat list of 27 real leaves (no sub-groups), most of which are
// classic Dolibarr pages now superseded by the real "Hotel Suite" SPA at
// custom/hotel/app.php (confirmed live: "Booking Management" and "Room
// Status" both redirect straight into it) — see hotelApi.ts's own top
// comment. Leaves below map to that SPA's own real, ported sections;
// anything still unmapped (Housekeeping, Maintenance, Waitlist, Room
// Service, Concierge, Reports, Quotations, Invoices, Rates & Channels,
// Settings) renders disabled until its own page is ported.
export const nav: NavSection = {
  key: 'hotel',
  label: 'Hotel',
  icon: BedDouble,
  items: [
    // Superseded by Hotel Suite Settings (Room Types/Bed Types/Booking
    // Types/Floors/Room Features/Rooms CRUD) — not yet ported, so these
    // stay unmapped for now rather than pointed at a page that doesn't
    // reflect them.
    { label: 'Room Settings' },
    { label: 'Room Type' },
    { label: 'Floor Details' },
    { label: 'Booking Types' },
    { label: 'Room Features' },
    { label: 'Bed Types' },
    { label: 'Room Management' },
    { label: 'Add Room' },
    { label: 'Room List' },
    // Superseded by Hotel Suite Guests (same societe/customer data).
    { label: 'Tenants', path: ROUTES.hotelGuests },
    { label: 'Add Tenant', path: ROUTES.hotelGuests },
    { label: 'List Tenant', path: ROUTES.hotelGuests },
    { label: 'Booking Management', path: ROUTES.bookingDashboard },
    { label: 'Booking/Check-In List', path: ROUTES.hotelReservations },
    { label: 'Check Out List', path: ROUTES.hotelFrontDesk },
    { label: 'Room Status', path: ROUTES.hotelRooms },
    // Superseded by Hotel Suite Concierge (Wake-up Calls + Enquiries) — not
    // yet ported.
    { label: 'Front Desk Services' },
    { label: 'Enquiry' },
    { label: 'Wake-Up Calls' },
    // Superseded by Hotel Suite Housekeeping — not yet ported.
    { label: 'Assign Room cleaning' },
    { label: 'Room cleaning Status' },
    // Superseded by Hotel Suite Invoices — not yet ported.
    { label: 'Invoice' },
    { label: 'Invoice List' },
    // Superseded by Hotel Suite Reports — not yet ported.
    { label: 'Reports' },
    { label: 'Booking Report' },
    { label: 'Room History' },
    { label: 'Room Cleaning Report' },
  ],
}
