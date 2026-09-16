// Parses the real holiday/list.php ("Holiday Management") page and its own
// holiday/ajax_holiday_list.php server-side DataTables endpoint — verified
// live against the real dev backend. Unlike most scraped pages this session,
// the row data itself is genuine JSON (DataTables' own
// {draw,recordsTotal,recordsFiltered,data} shape, each `data` row keyed "0"
// .."10" + rowid), not raw HTML — only the 5 stat cards at the top of
// list.php need scraping, since those render server-side into the initial
// page load rather than through that same AJAX endpoint.

export interface HolidayStats {
  employees: number
  leaveRecords: number
  thisMonth: number
  approved: number
  cancelled: number
}

// Every stat card shares one shape: `.ec-report-stats-title` (label)
// immediately followed by `.ec-report-stats-value` (the number) — confirmed
// live (Employees/Leave Records/This month/Approved/Cancelled, in that
// order, matching this app's own existing stat-card labels/captions
// already).
export function parseHolidayStats(doc: Document): HolidayStats {
  function get(label: string): number {
    const titleEl = Array.from(doc.querySelectorAll('.ec-report-stats-title')).find((el) => el.textContent?.trim().toLowerCase() === label.toLowerCase())
    const valueEl = titleEl?.nextElementSibling
    const n = Number((valueEl?.textContent ?? '').trim())
    return Number.isFinite(n) ? n : 0
  }
  return {
    employees: get('Employees'),
    leaveRecords: get('Leave Records'),
    thisMonth: get('This month'),
    approved: get('Approved'),
    cancelled: get('Cancelled'),
  }
}

export interface HolidayRequestRow {
  id: string
  ref: string
  employeeName: string
  validatorName: string
  typeLabel: string
  duration: string
  startDate: string // already display-formatted (MM/DD/YYYY) by the real endpoint
  endDate: string
  createDate: string // already display-formatted (MM/DD/YYYY hh:mm AM/PM)
  updateDate: string
  status: string // raw badge text (e.g. "Approved", "ToReview", "Draft") — shown as-is rather than forced through a closed enum, since Cancelled/Refused text wasn't available to confirm verbatim in this pass
}

function parseFragment(html: string): Document {
  return new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
}

// REF cell: an icon <span> immediately followed by the ref text as the
// anchor's own trailing text node (e.g. "HL2604-0003") — same shape as
// taskActivityParser.ts's thirdPartyCellName, reused here for the same
// reason (avoids picking up the icon span's own text).
function refCellText(html: string): string {
  const anchor = parseFragment(html).querySelector('a')
  if (!anchor) return parseFragment(html).body.textContent?.trim() ?? ''
  const trailingText = Array.from(anchor.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? '')
    .join('')
    .trim()
  return trailingText || anchor.textContent?.trim() || ''
}

// Employee/Validator cells render the display name inside a nested
// `.usertext` span — same convention already confirmed live across every
// other scraped user-link cell this session (taskActivityParser.ts).
function userCellText(html: string): string {
  return parseFragment(html).querySelector('.usertext')?.textContent?.trim() ?? ''
}

function plainCellText(html: string): string {
  return parseFragment(html).body.textContent?.trim() ?? ''
}

export interface HolidayAjaxResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  data: Record<string, unknown>[]
}

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  return typeof v === 'string' ? v : ''
}

export function parseHolidayRows(response: HolidayAjaxResponse): HolidayRequestRow[] {
  return response.data.map((row) => ({
    id: String(row.rowid ?? ''),
    ref: refCellText(cell(row, '1')),
    employeeName: userCellText(cell(row, '2')),
    validatorName: userCellText(cell(row, '3')),
    typeLabel: cell(row, '4').trim(),
    duration: cell(row, '5').trim(),
    startDate: cell(row, '6').trim(),
    endDate: cell(row, '7').trim(),
    createDate: cell(row, '8').trim(),
    updateDate: cell(row, '9').trim(),
    status: plainCellText(cell(row, '10')),
  }))
}
