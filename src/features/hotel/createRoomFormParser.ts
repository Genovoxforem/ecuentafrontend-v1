// create_room.php has no JSON API, so its two real dropdowns (#floor_id,
// #room_type_id) are scraped from the rendered page instead.
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
