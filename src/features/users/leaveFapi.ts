import { fapiGet } from '../../api/fapiEnvelope'
import type { HolidayRequestRow, HolidayStats } from './holidayParser'

// The leave list and its stat cards on payroll/fapi/leave_list.php (26 Oct 2026), replacing the scraped holiday/list.php cards and the
// holiday/ajax_holiday_list.php DataTables rows. newecuenta holds no leave request, so the item is the document's own shape ("from code"). The
// endpoint serves at most 200 rows a page, so the pages are read one after the other until the list is complete.

export interface FapiLeaveItem {
  id: number
  ref: string
  employee: { firstname: string; lastname: string; login: string }
  validator: { firstname: string; lastname: string; login: string } | null
  type_label: string
  duration_days: number
  date_debut: string
  date_fin: string
  date_create: string
  date_update: string
  status_label: string
}
export interface FapiLeaveList {
  stats: { employees: number; leave_records: number; this_month: number; approved: number; cancelled: number }
  items: FapiLeaveItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

const name = (u: { firstname: string; lastname: string; login: string } | null) => (u ? [u.firstname, u.lastname].filter(Boolean).join(' ') || u.login : '')
// "2026-10-26" -> "10/26/2026"
const mdy = (iso: string | null | undefined) => {
  const [y, m, d] = (iso ?? '').slice(0, 10).split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
// "2026-10-23 10:15:00" -> "10/23/2026 10:15 AM" (the way the old table printed it)
export const mdyHm = (value: string | null | undefined) => {
  const m = (value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return mdy(value)
  const h = Number(m[4])
  return `${m[2]}/${m[3]}/${m[1]} ${String(h % 12 || 12).padStart(2, '0')}:${m[5]} ${h >= 12 ? 'PM' : 'AM'}`
}

export const mapHolidayStats = (s: FapiLeaveList['stats']): HolidayStats => ({ employees: s.employees, leaveRecords: s.leave_records, thisMonth: s.this_month, approved: s.approved, cancelled: s.cancelled })

export const mapLeaveItem = (r: FapiLeaveItem): HolidayRequestRow => ({
  id: String(r.id),
  ref: r.ref,
  employeeName: name(r.employee),
  validatorName: name(r.validator),
  typeLabel: r.type_label,
  duration: String(r.duration_days),
  startDate: mdy(r.date_debut),
  endDate: mdy(r.date_fin),
  createDate: mdyHm(r.date_create),
  updateDate: mdyHm(r.date_update),
  status: r.status_label,
})

export const loadHolidayStats = async () => mapHolidayStats((await fapiGet<FapiLeaveList>('/payroll/fapi/leave_list.php', { limit: 1 })).stats)

export async function loadLeaveRequests(f: { from: string; to: string; status: string }): Promise<HolidayRequestRow[]> {
  const page = (n: number) =>
    fapiGet<FapiLeaveList>('/payroll/fapi/leave_list.php', { page: n, limit: 200, date_start: f.from || undefined, date_end: f.to || undefined, search_status: f.status || undefined })
  const first = await page(1)
  const rows = [...first.items]
  for (let n = 2; n <= Math.min(first.pagination.pages, 25); n++) rows.push(...(await page(n)).items)
  return rows.map(mapLeaveItem)
}
