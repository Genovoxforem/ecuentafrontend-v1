// booking/settings/create_room.php?action=create&type=1 has no JSON API of
// its own (it's a plain Dolibarr product-card POST+redirect form — see
// HotelAddRoomPage.tsx's own top comment), so its two real dropdowns
// (#floor_id, #room_type_id) are scraped directly out of the rendered page,
// same pattern as this app's other no-REST-API legacy sources (General
// Ledger, Warehouse stats — see legacyHtmlFetch.ts). Confirmed live: these
// are genuinely different, WORKING real ids (Dolibarr's generic category
// system, categories/card.php?type=24/25) from both r=roomtypes and
// settings.roomtype/settings.floor — a category created via that real form
// shows up here immediately (live-tested), even though neither of the
// Hotel Suite's own actions (savetype/savesuite) can create one that does.
export interface CreateRoomOption {
  id: string
  name: string
}

function parseSelectOptions(doc: Document, selectId: string): CreateRoomOption[] {
  const select = doc.querySelector(`#${selectId}`)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ id: o.getAttribute('value') ?? '', name: (o.textContent ?? '').trim() }))
    .filter((o) => o.id && o.id !== '-1')
}

export function parseCreateRoomFormOptions(doc: Document): { floors: CreateRoomOption[]; roomTypes: CreateRoomOption[] } {
  return {
    floors: parseSelectOptions(doc, 'floor_id'),
    roomTypes: parseSelectOptions(doc, 'room_type_id'),
  }
}
