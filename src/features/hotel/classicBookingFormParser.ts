// Parses the real classic "Add Booking" page (booking/reservation/booking.php
// ?type=booking) — confirmed live via curl this is a totally different real
// flow from the Hotel Suite SPA's own "New Booking" modal (a=createbooking):
// the real sidebar menu's "Booking/Check-In List" leaf links to
// booking/reservation/booking_list.php, NOT the Suite, and that classic
// page's own "+ Add" button goes to this exact form, saved via
// reservation_ajax.php?action=add_booking (live-tested: genuinely persists —
// {"status":"success","booking_id":1,...}). See hotel.queries.ts's own
// useHotelBookingFormOptions/useHotelCreateClassicBooking for the rest.

export interface ClassicBookingOption {
  value: string
  text: string
}

export interface ClassicBookingFormOptions {
  bookingTypes: ClassicBookingOption[]
  bookingSources: ClassicBookingOption[]
  checkinTypes: ClassicBookingOption[]
  roomStatuses: ClassicBookingOption[]
  complementary: ClassicBookingOption[]
}

function parseSelectOptions(doc: Document | Element, selector: string): ClassicBookingOption[] {
  const select = doc.querySelector(selector)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', text: (o.textContent ?? '').trim() }))
    .filter((o) => o.value !== '')
}

// The real form's booking_type/booking_source/checkin_type/room_status[]/
// complementary[0][] selects — see reservation_ajax.php's own consumer, the
// real bookingForm submit handler read directly from this page's HTML.
export function parseClassicBookingFormOptions(doc: Document): ClassicBookingFormOptions {
  return {
    bookingTypes: parseSelectOptions(doc, 'select[name="booking_type"]'),
    bookingSources: parseSelectOptions(doc, 'select[name="booking_source"]'),
    checkinTypes: parseSelectOptions(doc, 'select[name="checkin_type"]'),
    roomStatuses: parseSelectOptions(doc, 'select[name="room_status[]"]'),
    complementary: parseSelectOptions(doc, 'select[name="complementary[0][]"]'),
  }
}

// reservation_ajax.php?action=get_rooms_for_select returns
// {"status":"success","options":"<option value=..>..</option>..."} — a raw
// HTML fragment the real page injects directly into the room_number[]
// select (confirmed live: empty on this backend's current zero-room
// inventory, same root cause as r=available/rooms_admin both returning
// nothing — see HotelAddRoomPage.tsx's own top comment).
export function parseRoomOptionsFragment(fragmentHtml: string): ClassicBookingOption[] {
  if (!fragmentHtml.trim()) return []
  const doc = new DOMParser().parseFromString(`<select>${fragmentHtml}</select>`, 'text/html')
  return parseSelectOptions(doc, 'select')
}
