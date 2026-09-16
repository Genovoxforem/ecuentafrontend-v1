// Parses compta/resultat/task_activity.php (the real "Task / Activities
// Details" report) — no REST API exists for Dolibarr's agenda/actioncomm
// records on this backend (same gap agenda.queries.ts's own useRecentActivity
// documents). Verified live against the real dev backend: a GET returns the
// filter form (a fresh CSRF token + the "Customer Details" <select> this
// report's own combo uses — every third party regardless of customer/
// prospect/supplier type, unlike useCustomersSummary's customer-only list),
// and POSTing the same 5 fields the real form does (token, modecompta,
// newdatepicker, type, customerdet) re-renders the page with a
// `<table id="example3">` of results appended — but ONLY when at least one
// row matches; a 0-row search adds nothing at all (confirmed live:
// byte-identical to the un-searched page — a real backend quirk this app
// surfaces as an honest "no results" message rather than silently looking
// unsearched).

export interface TaskActivityFormContext {
  token: string
  thirdPartyOptions: { value: string; label: string; description?: string }[]
}

// Each <option>'s plain text content is actually two lines — the company
// name, then a second "ref | Tpin | Country" line meant for the data-html
// rich-select2 rendering this app doesn't reproduce — split apart here so
// the name alone becomes the option label (the second line becomes an
// optional description, same shape SearchableSelect already expects
// elsewhere in this app, e.g. customerOptions.ts).
export function parseTaskActivityForm(doc: Document): TaskActivityFormContext {
  const token = doc.querySelector('input[name="token"]')?.getAttribute('value') ?? ''
  const thirdPartyOptions = Array.from(doc.querySelectorAll('select#customerdet option'))
    .map((o) => {
      const value = o.getAttribute('value') ?? ''
      const [label, ...rest] = (o.textContent ?? '').split('\n').map((line) => line.trim())
      const description = rest.join(' ').trim()
      return { value, label: label ?? '', description: description || undefined }
    })
    .filter((o) => o.value && o.value !== '-1')
  return { token, thirdPartyOptions }
}

export interface TaskActivityRow {
  id: string | null
  subject: string
  date: string // ISO yyyy-mm-dd, converted from the real page's dd/mm/yyyy
  relatedTo: string
  priority: string
  userRelatedTo: string
  thirdPartyRelatedTo: string
  thirdPartySocId: string | null // from the Thirdparty Related To cell's real /comm/card.php?socid=X link
  createdBy: string
  status: string
}

// "19/05/2026" -> "2026-05-19"
function toIsoDate(ddmmyyyy: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmyyyy.trim())
  if (!m) return ''
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

// User Related To / Created By cells render the display name inside a
// nested `.usertext` span; Thirdparty Related To instead renders it as a
// bare trailing text node right after an avatar-circle div with no such
// class — both confirmed live against real rows for all 3 report types
// (Tasks/Meetings/Calls all share this exact table markup).
function userCellName(cell: Element | undefined): string {
  return cell?.querySelector('.usertext')?.textContent?.trim() ?? ''
}

function thirdPartyCellName(cell: Element | undefined): string {
  const anchor = cell?.querySelector('a')
  if (!anchor) return (cell?.textContent ?? '').trim()
  const trailingText = Array.from(anchor.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? '')
    .join('')
    .trim()
  return trailingText || (anchor.textContent ?? '').trim()
}

export function parseTaskActivityRows(doc: Document): TaskActivityRow[] {
  const rows: TaskActivityRow[] = []
  doc.querySelectorAll('table#example3 tbody tr').forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll('td'))
    if (cells.length < 8) return
    const subjectLink = cells[0].querySelector('a.task_activity')
    const thirdPartyHref = cells[5].querySelector('a')?.getAttribute('href') ?? ''
    const socidMatch = /socid=(\d+)/.exec(thirdPartyHref)
    rows.push({
      id: subjectLink?.getAttribute('data-id') ?? null,
      subject: (cells[0].textContent ?? '').trim(),
      date: toIsoDate(cells[1].textContent ?? ''),
      relatedTo: (cells[2].textContent ?? '').trim(),
      priority: (cells[3].textContent ?? '').trim(),
      userRelatedTo: userCellName(cells[4]),
      thirdPartyRelatedTo: thirdPartyCellName(cells[5]),
      thirdPartySocId: socidMatch ? socidMatch[1] : null,
      createdBy: userCellName(cells[6]),
      status: (cells[7].textContent ?? '').trim(),
    })
  })
  return rows
}

// ── compta/resultat/task_activity-kanban.php — the real "Kanban" view the
// title bar's second toggle icon links to. A genuinely different report
// from the one above: per-customer cards (name/code/created date/task-
// meeting-call sub-counts) plus a real, live-computed Statistics sidebar —
// both confirmed to change with the filters (Total Prospects/Total
// Customers/Total Tasks/etc. all went from 0 to real non-zero counts once a
// wide date range was submitted), not static placeholders. Same CSRF token
// + "Customer Details" combo as task_activity.php, plus a Customer Type
// (client) radio-like select and a Created By (fk_user) combo this page
// alone has.

export interface TaskActivityKanbanFormContext {
  token: string
  thirdPartyOptions: { value: string; label: string; description?: string }[]
  userOptions: { value: string; label: string }[]
  // Real: unlike task_activity.php's plain list, this report's Statistics
  // sidebar (and customer-card list) is computed and rendered on every page
  // load — including the very first unsearched GET — using the same
  // "this month" default the date field itself pre-fills, not gated behind
  // an explicit "Search" click. Confirmed live: a fresh GET already showed
  // non-zero Total Calls. Carried on the form context (not a separate
  // query) so the Kanban view can show real numbers immediately on mount
  // instead of an empty sidebar until the user clicks View Report.
  initialStats: TaskActivityStats
  initialCards: TaskActivityKanbanCard[]
}

// The Customer Type <select name="client"> values are hardcoded in the real
// page's own markup (2/3/1/0), not read from a dictionary table — confirmed
// live, so listed directly rather than scraped.
export const TASK_ACTIVITY_CUSTOMER_TYPES = [
  { value: '2', label: 'Prospect' },
  { value: '3', label: 'ProspectCustomer' },
  { value: '1', label: 'Customer' },
  { value: '0', label: 'NorProspectNorCustomer' },
]

export function parseTaskActivityKanbanForm(doc: Document): TaskActivityKanbanFormContext {
  const { token, thirdPartyOptions } = parseTaskActivityForm(doc)
  const userOptions = Array.from(doc.querySelectorAll('select#fk_user option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value && o.value !== '-1')
  return { token, thirdPartyOptions, userOptions, initialStats: parseTaskActivityStats(doc), initialCards: parseTaskActivityKanbanCards(doc) }
}

export interface TaskActivityStats {
  totalProspects: number
  totalCustomers: number
  prospectToCustomer: number
  totalDemosGiven: number
  totalTasks: number
  totalMeetings: number
  totalCalls: number
  totalProposals: number
  leadsWon: number
  totalDropped: number
  totalLoss: number
  totalPaidLeads: number
  totalOrganicLeads: number
}

// Every stat (the 8-row "Statistics" panel and the two 3/2-row "card" blocks
// below it) shares one markup shape: a `.card-title` holding the label, with
// its value in the next sibling element — generic enough to cover both
// without two separate selectors.
function parseStatNumber(doc: Document, label: string): number {
  const titleEl = Array.from(doc.querySelectorAll('.card-title')).find((el) => el.textContent?.trim() === label)
  const valueEl = titleEl?.nextElementSibling
  const n = Number((valueEl?.textContent ?? '').trim())
  return Number.isFinite(n) ? n : 0
}

export function parseTaskActivityStats(doc: Document): TaskActivityStats {
  return {
    totalProspects: parseStatNumber(doc, 'Total Prospects'),
    totalCustomers: parseStatNumber(doc, 'Total Customers'),
    prospectToCustomer: parseStatNumber(doc, 'Prospect → Customer'),
    totalDemosGiven: parseStatNumber(doc, 'Total Demos Given'),
    totalTasks: parseStatNumber(doc, 'Total Tasks'),
    totalMeetings: parseStatNumber(doc, 'Total Meetings'),
    totalCalls: parseStatNumber(doc, 'Total Calls'),
    totalProposals: parseStatNumber(doc, 'Total Proposals'),
    leadsWon: parseStatNumber(doc, 'Leads Won'),
    totalDropped: parseStatNumber(doc, 'Total Dropped'),
    totalLoss: parseStatNumber(doc, 'Total Loss'),
    totalPaidLeads: parseStatNumber(doc, 'Total Paid Leads'),
    totalOrganicLeads: parseStatNumber(doc, 'Total Organic Leads'),
  }
}

export interface TaskActivityKanbanCard {
  socid: string | null
  name: string
  code: string
  createdDate: string // kept as the real page's own display text (e.g. "11,Sep 2025") — no clean machine format to convert from
  activitySummary: string[] // e.g. ["0 Tasks", "0 Meetings", "0 Calls"]
  createdBy: string
}

// Skips the real card's "View Activities" eye icon and chat button — both
// open an offcanvas/AJAX panel this app has no way to reproduce (same
// "show the real visible data, skip the broken/complex nested interaction"
// call this file already makes for task_activity.php's Subject-click modal).
export function parseTaskActivityKanbanCards(doc: Document): TaskActivityKanbanCard[] {
  const cards: TaskActivityKanbanCard[] = []
  doc.querySelectorAll('.ec-task-activity-item').forEach((item) => {
    const link = item.querySelector('.ec-task-activity-item__link')
    const href = link?.getAttribute('href') ?? ''
    const socidMatch = /socid=(\d+)/.exec(href)
    const metaRows = Array.from(item.querySelectorAll(':scope > .ec-task-activity-item__title > div.d-flex'))
    const codeDateSpans = metaRows[1]?.querySelectorAll('span.text-muted') ?? []
    const activitySummary = Array.from(item.querySelectorAll('.ec-task-activity-item__tasks ul li span')).map((s) => (s.textContent ?? '').trim())
    cards.push({
      socid: socidMatch ? socidMatch[1] : null,
      name: (link?.textContent ?? '').trim(),
      code: (codeDateSpans[0]?.textContent ?? '').trim(),
      createdDate: (codeDateSpans[1]?.textContent ?? '').trim(),
      activitySummary,
      createdBy: item.querySelector('.usera .usertext')?.textContent?.trim() ?? '',
    })
  })
  return cards
}
