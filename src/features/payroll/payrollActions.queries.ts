import { useMutation } from '@tanstack/react-query'

// Real, live write endpoint for 8 of the Payroll module's Human Resource
// pages — payroll/ajax.php (confirmed by reading it directly, not guessed).
// It defines NOCSRFCHECK itself, so these are plain same-origin POSTs with
// the query string built exactly like each page's own jQuery $.ajax() call
// (verified against holiday.php/award.php/transfers.php/resignations.php/
// travel.php/complaints.php/warnings.php/terminations.php's own JS). Every
// action echoes a bare status code (0 = success, 3 = duplicate, anything
// else = failure) — not JSON — so this parses that instead of res.json().
// Indicator and Appraisal (the other 2 HR pages) are NOT covered here: their
// "Add" panel reveal depends on payroll/ajax_search.php, which returns
// pre-rendered HTML fragments rather than a JSON/parseable contract — see
// IndicatorForm/AppraisalForm's own DisabledFormPage note.
async function postPayrollAjax(params: URLSearchParams): Promise<void> {
  const res = await fetch(`/payroll/ajax.php?${params.toString()}`, { method: 'POST', credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const code = (await res.text()).trim()
  if (code === '0') return
  if (code === '3') throw new Error('A matching record already exists on the backend.')
  throw new Error('The legacy backend rejected the request.')
}

// This deployment has exactly one entity (llx_entity has a single row,
// "Master entity", rowid 1 — confirmed via read-only query) and the real
// Entity <select> on Holiday/Transfers has no JSON API of its own (it's a
// PHP-rendered <option> loop over llx_entity). Rather than fabricate a
// dropdown backed by nothing, every entity_data/entity param below is sent
// as this fixed real id.
const SINGLE_ENTITY_ID = '1'

export interface NewHolidayInput {
  leaveName: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD, optional (blank = same as start)
  note: string
  createdByUserId: number
}
export function useCreateHoliday() {
  return useMutation({
    mutationFn: async (input: NewHolidayInput) => {
      const params = new URLSearchParams({
        saveholiday: input.leaveName,
        st_date: input.startDate,
        en_date: input.endDate,
        entity_data: SINGLE_ENTITY_ID,
        insert_id: String(input.createdByUserId),
        lev_note: input.note,
      })
      await postPayrollAjax(params)
    },
  })
}

export interface NewAwardInput {
  employeeId: number
  award: string
  giftItem: string
  cashPrice: string
  month: string // YYYY-MM
  awardDate: string // YYYY-MM-DD
  comments: string
}
export function useCreateAward() {
  return useMutation({
    mutationFn: async (input: NewAwardInput) => {
      const params = new URLSearchParams({
        saveaward: String(input.employeeId),
        award: input.award,
        gifti: input.giftItem,
        cashp: input.cashPrice,
        monthPic: input.month,
        datePic: input.awardDate,
        comments: input.comments,
      })
      await postPayrollAjax(params)
    },
  })
}

export interface NewTransferInput {
  employeeId: number
  transferDate: string
  description: string
}
export function useCreateTransfer() {
  return useMutation({
    mutationFn: async (input: NewTransferInput) => {
      const params = new URLSearchParams({
        savetransfer: '1',
        employee: String(input.employeeId),
        entity: SINGLE_ENTITY_ID,
        transDate: input.transferDate,
        comments: input.description,
      })
      await postPayrollAjax(params)
    },
  })
}

export interface NewResignationInput {
  employeeId: number
  resignationDate: string
  lastWorkingDay: string
  reason: string
}
export function useCreateResignation() {
  return useMutation({
    mutationFn: async (input: NewResignationInput) => {
      const params = new URLSearchParams({
        saveresign: String(input.employeeId),
        resignDate: input.resignationDate,
        lastday: input.lastWorkingDay,
        Reason: input.reason,
      })
      await postPayrollAjax(params)
    },
  })
}

export interface NewTravelInput {
  employeeId: number
  startDate: string
  endDate: string
  purpose: string
  country: string
  description: string
}
export function useCreateTravel() {
  return useMutation({
    mutationFn: async (input: NewTravelInput) => {
      const params = new URLSearchParams({
        savetravel: '1',
        employee: String(input.employeeId),
        startDate: input.startDate,
        endDate: input.endDate,
        purpose: input.purpose,
        country: input.country,
        comments: input.description,
      })
      await postPayrollAjax(params)
    },
  })
}

export interface NewComplaintInput {
  complaintFromId: number
  complaintAgainstId: number
  title: string
  complaintDate: string
  description: string
}
export function useCreateComplaint() {
  return useMutation({
    mutationFn: async (input: NewComplaintInput) => {
      const params = new URLSearchParams({
        savecomplaint: '1',
        c_from: String(input.complaintFromId),
        c_against: String(input.complaintAgainstId),
        title: input.title,
        c_date: input.complaintDate,
        comments: input.description,
      })
      await postPayrollAjax(params)
    },
  })
}

export interface NewWarningInput {
  warningById: number
  warningToId: number
  subject: string
  warningDate: string
  description: string
}
export function useCreateWarning() {
  return useMutation({
    mutationFn: async (input: NewWarningInput) => {
      const params = new URLSearchParams({
        savewarning: '1',
        w_by: String(input.warningById),
        w_to: String(input.warningToId),
        subject: input.subject,
        w_date: input.warningDate,
        comments: input.description,
      })
      await postPayrollAjax(params)
    },
  })
}

// Verbatim from terminations.php's own PHP-rendered <select> (a hardcoded
// $typs array, not a DB table) — reproducing static reference code, not
// scraping live data.
export const TERMINATION_TYPES = [
  'Constructive discharge',
  'Firing',
  'Layoff',
  'Termination for cause',
  'Termination by mutual agreement',
  'Termination with prejudice',
  'Termination without prejudice',
  'Involuntary termination',
  'Voluntary termination',
  'Wrongful termination',
  'End of a work contract or temporary employment',
]
export interface NewTerminationInput {
  employeeId: number
  terminationType: string
  noticeDate: string
  terminationDate: string
  description: string
}
export function useCreateTermination() {
  return useMutation({
    mutationFn: async (input: NewTerminationInput) => {
      const params = new URLSearchParams({
        savetermination: '1',
        employee: String(input.employeeId),
        terType: input.terminationType,
        notDate: input.noticeDate,
        terDate: input.terminationDate,
        comments: input.description,
      })
      await postPayrollAjax(params)
    },
  })
}

// Real via payroll/ajax.php?saveAdvrequest=... (payroll/advance.php's
// "Request Advance Salary" panel). The backend itself only inserts when the
// employee already has a Salary Grade assigned (llx_payroll_salary_list) —
// otherwise it echoes 2, surfaced here as a real error rather than guessed.
export interface NewAdvanceInput {
  employeeId: number
  amount: string
  deductMonth: string // YYYY-MM
  reason: string
  requestedByUserId: number
}
export function useCreateAdvance() {
  return useMutation({
    mutationFn: async (input: NewAdvanceInput) => {
      const params = new URLSearchParams({
        saveAdvrequest: String(input.employeeId),
        advance_amount: input.amount,
        monthPic: input.deductMonth,
        reason: input.reason,
        user_id: String(input.requestedByUserId),
      })
      const res = await fetch(`/payroll/ajax.php?${params.toString()}`, { method: 'POST', credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const code = (await res.text()).trim()
      if (code === '0') return
      if (code === '2') throw new Error('This employee has no Salary Grade assigned yet (required before requesting an advance).')
      throw new Error('The legacy backend rejected the request.')
    },
  })
}

// Real via payroll/ajax.php?saveLoan=... (payroll/loan.php's "Request Loan"
// panel).
export interface NewLoanInput {
  employeeId: number
  deductFrom: string
  loanAmount: string
  loanPeriodMonths: string
  installment: string
  reason: string
}
export function useCreateLoan() {
  return useMutation({
    mutationFn: async (input: NewLoanInput) => {
      const params = new URLSearchParams({
        saveLoan: String(input.employeeId),
        deFrom: input.deductFrom,
        loan_amt: input.loanAmount,
        periods: input.loanPeriodMonths,
        installment: input.installment,
        reason: input.reason,
      })
      await postPayrollAjax(params)
    },
  })
}

// Real via payroll/ajax.php?savehourly_grade=... (payroll/hour_temp.php's
// "Set Hourly Grade" modal).
export interface NewHourlyGradeInput {
  grade: string
  rate: string
}
export function useCreateHourlyGrade() {
  return useMutation({
    mutationFn: async (input: NewHourlyGradeInput) => {
      const params = new URLSearchParams({ savehourly_grade: input.grade, hourly_rate: input.rate })
      await postPayrollAjax(params)
    },
  })
}

// Real via payroll/ajax.php?saveshifts=... (payroll/shifts.php's "Add
// Shift" panel). The real Shift Type <select> only ever offers "Fixed"
// (its "Flexible" option is commented out in the source, unreachable), so
// the fixed-only fields it always sends alongside (holiday/auto-clock-out)
// are hardcoded to their real always-empty/zero values rather than exposed
// as dead inputs.
export interface NewShiftInput {
  name: string
  mondayIn: string
  mondayOut: string
  tuesdayIn: string
  tuesdayOut: string
  wednesdayIn: string
  wednesdayOut: string
  thursdayIn: string
  thursdayOut: string
  fridayIn: string
  fridayOut: string
  saturdayIn: string
  saturdayOut: string
  sundayIn: string
  sundayOut: string
}
export function useCreateShift() {
  return useMutation({
    mutationFn: async (input: NewShiftInput) => {
      const params = new URLSearchParams({
        saveshifts: input.name,
        ShiftType: 'Fixed',
        start_t: '',
        end_t: '',
        holiday: '',
        autochbox: '0',
        auto_outTime: '',
        monday_in_time: input.mondayIn,
        monday_out_time: input.mondayOut,
        tuesday_in_time: input.tuesdayIn,
        tuesday_out_time: input.tuesdayOut,
        wednesday_in_time: input.wednesdayIn,
        wednesday_out_time: input.wednesdayOut,
        thursday_in_time: input.thursdayIn,
        thursday_out_time: input.thursdayOut,
        friday_in_time: input.fridayIn,
        friday_out_time: input.fridayOut,
        saturday_in_time: input.saturdayIn,
        saturday_out_time: input.saturdayOut,
        sunday_in_time: input.sundayIn,
        sunday_out_time: input.sundayOut,
      })
      const res = await fetch(`/payroll/ajax.php?${params.toString()}`, { method: 'POST', credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const code = (await res.text()).trim()
      if (code === '0') return
      if (code === '2') throw new Error('A shift with this name already exists.')
      throw new Error('The legacy backend rejected the request.')
    },
  })
}
