import { BedDouble } from 'lucide-react'
import type { NavSection } from '../navTypes'
import { ROUTES } from '../../routes'

// Mirrors the real "Hotel" left menu (llx_menu, mainmenu=hotel) — 7 groups,
// mostly classic Dolibarr pages now superseded by the Hotel Suite SPA at
// custom/hotel/app.php. Calendar, Room QR, Maintenance, Waitlist, Room
// Service, Rooms and Housekeeping have no counterpart in the old menu (new
// in the Suite), so they're only reachable by direct route, not from here.
export const nav: NavSection = {
  key: 'hotel',
  label: 'Hotel',
  icon: BedDouble,
  items: [
    {
      label: 'Room Settings',
      // Not ROUTES.hotelSettings — that's the Suite's own Settings tab, reached from HotelSuiteLayout's sidebar instead.
      path: ROUTES.hotelRoomTypes,
      items: [
        { label: 'Room Type', path: ROUTES.hotelRoomTypes },
        { label: 'Floor Details', path: ROUTES.hotelFloorTypes },
        { label: 'Booking Types', path: ROUTES.hotelBookingTypes },
        { label: 'Room Features', path: ROUTES.hotelRoomFeatures },
        { label: 'Bed Types', path: ROUTES.hotelBedTypes },
      ],
    },
    {
      label: 'Room Management',
      path: ROUTES.hotelRoomList,
      items: [
        { label: 'Add Room', path: ROUTES.hotelAddRoom },
        { label: 'Room List', path: ROUTES.hotelRoomList },
      ],
    },
    // Both leaves reuse the main Customers section's real pages. Add Tenant's
    // own real classic page (societe/card.php?action=create&type=c) is
    // broken (renders an unrelated page), so this points at the already-
    // working ThirdPartyCreateForm.tsx instead.
    {
      label: 'Tenants',
      path: ROUTES.customerList,
      items: [
        { label: 'Add Tenant', path: ROUTES.customersCreate },
        { label: 'List Tenant', path: ROUTES.customerList },
      ],
    },
    // "Booking/Check-In List" and "Check Out List" match their real classic
    // pages (booking_list.php / checkout_list.php). "Room Status" opens
    // custom/hotel/app.php same as this group's own header — both land on
    // the Suite's Dashboard tab, not a room-specific view. Front Desk has no
    // classic-menu counterpart but stays listed since it's the only place
    // check-in/check-out actions live.
    {
      label: 'Booking Management',
      // No path — a pure expand/collapse heading, not a clickable page (per
      // explicit request). "Room Status" below is the only child that opens
      // the Hotel Suite standalone app.
      items: [
        { label: 'Booking/Check-In List', path: ROUTES.hotelReservations },
        { label: 'Check Out List', path: ROUTES.hotelCheckoutList },
        { label: 'Room Status', path: ROUTES.bookingDashboard },
        { label: 'Front Desk (Check-In/Out)', path: ROUTES.hotelFrontDesk },
      ],
    },
    // Each leaf matches its own real classic page (enquiry.php,
    // wake_up_calls.php, assign_room_cleaning.php, room_cleaning.php).
    {
      label: 'Front Desk Services',
      path: ROUTES.hotelEnquiry,
      items: [
        { label: 'Enquiry', path: ROUTES.hotelEnquiry },
        { label: 'Wake-Up Calls', path: ROUTES.hotelWakeUpCalls },
        { label: 'Assign Room Cleaning', path: ROUTES.hotelAssignRoomCleaning },
        { label: 'Room Cleaning Status', path: ROUTES.hotelRoomCleaningStatus },
      ],
    },
    // Superseded by Hotel Suite Invoices.
    {
      label: 'Invoice',
      path: ROUTES.hotelInvoices,
      items: [{ label: 'Invoice List', path: ROUTES.hotelInvoices }],
    },
    // The Suite's own combined Reports view (KPIs + Night Audit) has no
    // classic-menu leaf, so it's listed here as "Suite Reports & Night Audit".
    {
      label: 'Reports',
      path: ROUTES.hotelBookingReport,
      items: [
        { label: 'Booking Report', path: ROUTES.hotelBookingReport },
        { label: 'Room History', path: ROUTES.hotelRoomHistoryReport },
        { label: 'Room Cleaning Report', path: ROUTES.hotelRoomCleaningReport },
        { label: 'Suite Reports & Night Audit', path: ROUTES.hotelReports },
      ],
    },
  ],
}
