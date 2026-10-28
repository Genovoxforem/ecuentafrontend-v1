// "Holiday Management" (classic holiday/list.php): the 5 stat cards and the leave requests, both filled from
// payroll/fapi/leave_list.php (leaveFapi.ts).

export interface HolidayStats {
  employees: number
  leaveRecords: number
  thisMonth: number
  approved: number
  cancelled: number
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
