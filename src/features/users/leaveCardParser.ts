// Parses the real holiday/card.php?id=N page ("Leave request" card). The
// fields are label/value pairs of consecutive `.col-md-3` cells inside the
// card's `.form-tab` row (User, Type, Start date, End date, Number of days,
// Description, Requested by, Approved by, Creation date, Date approved, …),
// and the status is the badge under the banner. Which pairs appear depends on
// the request's state (e.g. refused/cancelled ones add who/when/why), so they
// are read generically rather than by fixed label. Confirmed against a live
// approved request.

export interface LeaveCardField {
  label: string
  value: string
}

export interface LeaveCard {
  status: string
  fields: LeaveCardField[]
}

function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseLeaveCard(doc: Document): LeaveCard | null {
  const row = doc.querySelector('.fichehalfleft .form-tab .row')
  if (!row) return null
  const cells = Array.from(row.querySelectorAll(':scope > .col-md-3'))
  const fields: LeaveCardField[] = []
  for (let i = 0; i + 1 < cells.length; i += 2) {
    const label = clean(cells[i].textContent)
    if (!label) continue
    fields.push({ label, value: clean(cells[i + 1].textContent) })
  }
  const status = clean(doc.querySelector('.subTitle .badge')?.textContent)
  return { status, fields }
}
