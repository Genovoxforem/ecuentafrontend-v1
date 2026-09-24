// Parses the classic "Add Booking" page (booking.php?type=booking), a
// separate flow from the Suite's "New Booking" modal. Saved via
// reservation_ajax.php?action=add_booking.

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

// get_rooms_for_select returns {"options":"<option ...>...</option>..."} —
// a raw HTML fragment the real page injects into the room_number[] select.
export function parseRoomOptionsFragment(fragmentHtml: string): ClassicBookingOption[] {
  if (!fragmentHtml.trim()) return []
  const doc = new DOMParser().parseFromString(`<select>${fragmentHtml}</select>`, 'text/html')
  return parseSelectOptions(doc, 'select')
}
