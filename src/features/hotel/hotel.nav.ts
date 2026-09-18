import { BedDouble } from 'lucide-react'
import type { NavSection } from '../navTypes'
import { ROUTES } from '../../routes'

// Mirrors the real app's "Hotel" left menu (llx_menu, mainmenu=hotel) — 7
// real groups (Room Settings, Room Management, Tenants, Booking Management,
// Front Desk Services, Invoice, Reports — each with its own bulleted
// sub-items), most of which are classic Dolibarr pages now superseded by
// the real "Hotel Suite" SPA at custom/hotel/app.php (confirmed live:
// "Booking Management" and "Room Status" both redirect straight into it) —
// see hotelApi.ts's own top comment. Every leaf below maps to that SPA's
// own real, ported section, except the 5 "Room Settings" children — each of
// those gets its own dedicated page (HotelRoomTypesPage.tsx /
// HotelFloorTypesPage.tsx / HotelBookingTypesPage.tsx / HotelBedTypesPage.tsx /
// HotelRoomFeaturesPage.tsx) instead of the shared Hotel Settings grid,
// since Room Type and Floor Details's real classic pages
// (categories/index.php?type=25 / type=24) both crash with a PHP fatal
// error — see those files' own top comments for the rest. Each group
// header keeps the same path its flat entry used to carry (matching
// NavGroupItem's documented "simultaneously a clickable page AND a parent"
// shape). Calendar, Room QR, Maintenance, Waitlist, Room Service, Rooms
// (HotelRooms.tsx, the Suite's own rack view — matches its internal
// "Rooms" tab, not the classic "Room Status" menu leaf, see below) and
// Housekeeping (the rack quick-clean-tile view — its own tap-to-mark-ready
// action has no real classic counterpart either, now that Assign Room
// Cleaning and Room Cleaning Status below each have their own dedicated
// page) have no counterpart in the old backend menu at all (new in the
// Suite), so they're only reachable by direct route/breadcrumb, not from
// this sidebar.
export const nav: NavSection = {
  key: 'hotel',
  label: 'Hotel',
  icon: BedDouble,
  items: [
    {
      label: 'Room Settings',
      // Points at its own first child (Room Management's own group header
      // does the same with hotelRoomList), not ROUTES.hotelSettings —
      // that route is now the real Hotel Suite's own "Settings" tab
      // (custom/hotel/api.php?r=paycfg), reachable from HotelSuiteLayout's
      // own sidebar instead. Room Settings' children are all classic pages
      // with no real Suite counterpart, so reusing hotelSettings here would
      // have wrapped this classic group's landing page in Suite-only chrome.
      path: ROUTES.hotelRoomTypes,
      items: [
        { label: 'Room Type', path: ROUTES.hotelRoomTypes },
        { label: 'Floor Details', path: ROUTES.hotelFloorTypes },
        { label: 'Booking Types', path: ROUTES.hotelBookingTypes },
        { label: 'Room Features', path: ROUTES.hotelRoomFeatures },
        { label: 'Bed Types', path: ROUTES.hotelBedTypes },
      ],
    },
    // "Add Room" gets its own dedicated page (HotelAddRoomPage.tsx) — its
    // real classic form (booking/settings/create_room.php) is a ~30-field
    // Dolibarr product card; this exposes only the fields the real Hotel
    // Suite write actually accepts, same reasoning as the Room Settings
    // pages above. "Room List" also gets its own page (HotelRoomListPage.tsx),
    // matching the real classic booking/settings/room_list.php table layout.
    {
      label: 'Room Management',
      path: ROUTES.hotelRoomList,
      items: [
        { label: 'Add Room', path: ROUTES.hotelAddRoom },
        { label: 'Room List', path: ROUTES.hotelRoomList },
      ],
    },
    // Both leaves are the exact same real backend pages the main Customers
    // section already has, just reached via a different leftmenu param that
    // only changes which sidebar item is highlighted:
    // - "List Tenant" = societe/list.php?type=c (confirmed live: identical
    //   stat cards and Third-Party Name/Country/Outstanding Balance/Tpin/
    //   Sales Representatives/Email & Phone/Nature Of Third Party/Tracking
    //   Id/Creation Date/Status columns).
    // - "Add Tenant" = societe/card.php?action=create&type=c on paper, but
    //   that URL is confirmed live to NOT render the expected create form on
    //   this backend at all (it renders an unrelated "Class" page instead,
    //   reproducibly, with and without the menu's own extra params) — a
    //   real, separate backend bug from Room Type/Floor's own. The actual
    //   real write behind "New Customer" doesn't use that broken page
    //   either: ThirdPartyCreateForm.tsx already posts to the genuinely
    //   working societe/api/societes.php?action=create JSON endpoint, so
    //   this reuses that same already-built, already-working real page
    //   instead, rather than the Hotel Suite's own separate "Guest
    //   Directory" quick-add (r=guests/a=saveguest, name/email/phone only,
    //   no real match to the classic form's own fuller field set).
    {
      label: 'Tenants',
      path: ROUTES.customerList,
      items: [
        { label: 'Add Tenant', path: ROUTES.customersCreate },
        { label: 'List Tenant', path: ROUTES.customerList },
      ],
    },
    // "Booking/Check-In List" (HotelReservations.tsx) and "Check Out List"
    // (HotelCheckOutListPage.tsx) both now match their own real classic
    // pages exactly — booking/reservation/booking_list.php and .../
    // checkout_list.php respectively — instead of the Suite's own views.
    // Confirmed live: the real llx_menu row for "Booking/Check-In List"
    // itself points at booking_list.php, NOT custom/hotel/hotelindex.php.
    // "Room Status" is different — confirmed live by directly clicking it
    // in the real backend: it opens custom/hotel/app.php, the exact same
    // real URL "Booking Management" (this group's own header) already
    // redirects to, landing on the Suite's own Dashboard tab both times
    // (not a room-specific view — the classic leftmenu param only
    // highlights a sidebar row, the Suite's own client-side SPA routing
    // doesn't read it) — so this leaf now points at the same real
    // HotelDashboard.tsx page as the group header, matching that observed
    // behavior exactly rather than the Suite's own separate internal
    // "Rooms" rack tab (HotelRooms.tsx, still real and working, just no
    // longer linked from here — see this file's own top comment). That
    // classic list page's own real "+ Add" button goes to
    // booking/reservation/booking.php?type=booking (HotelNewBooking.tsx,
    // rebuilt to match field-for-field), saved via reservation_ajax.php?
    // action=add_booking — see hotel.queries.ts's own top comment on the
    // classic-booking hooks for the full live-test trail. Front Desk
    // (arrivals/in-house/upcoming tabs) is the only place with real
    // check-in/check-out actions and has no classic-menu counterpart of its
    // own, so it stays listed here too (as "Front Desk (Check-In/Out)")
    // rather than becoming sidebar-unreachable — the same reasoning as
    // Calendar/Room QR/etc. not being classic-menu items, except this one
    // still needs a discoverable path since it's the only place those
    // actions live.
    {
      label: 'Booking Management',
      path: ROUTES.bookingDashboard,
      items: [
        { label: 'Booking/Check-In List', path: ROUTES.hotelReservations },
        { label: 'Check Out List', path: ROUTES.hotelCheckoutList },
        { label: 'Room Status', path: ROUTES.bookingDashboard },
        { label: 'Front Desk (Check-In/Out)', path: ROUTES.hotelFrontDesk },
      ],
    },
    // Each of these 4 leaves gets its own dedicated page matching its own
    // real classic table/form (booking/reservation/enquiry.php,
    // booking/service/wake_up_calls.php, assign_room_cleaning.php and
    // room_cleaning.php — confirmed live, four genuinely separate backend
    // pages, not the same page under different leftmenu highlights as
    // first assumed for the first two), same carve-out reasoning as Check
    // Out List above. The old combined Concierge and Housekeeping
    // Suite-style views are gone from here now that every leaf that used
    // to share them has a real dedicated page of its own — Housekeeping's
    // own rack quick-clean-tile view (no classic counterpart) still exists,
    // just not linked from this sidebar, per this file's own top comment.
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
    // All 3 real classic leaves here now have their own dedicated page:
    // Booking Report (HotelBookingReportPage.tsx, joining r=bookings with
    // r=report&type=history by booking number — bookings alone has no room
    // field), Room History (HotelRoomHistoryReportPage.tsx, r=report&
    // type=history, gated behind picking a room first like the real page),
    // and Room Cleaning Report (HotelRoomCleaningReportPage.tsx, r=report&
    // type=cleaning — richer than r=cleanjobs, it genuinely has a Completed
    // Date field). The Suite's own combined Reports view (KPIs, the other 5
    // ledger tabs, and Night Audit — the only place that real action lives)
    // has no classic-menu leaf of its own, so it stays listed here too as
    // "Suite Reports & Night Audit" rather than becoming unreachable, same
    // reasoning as Front Desk under Booking Management above.
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
